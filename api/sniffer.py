"""
sniffer.py - Scapy ile ağ paket yakalama modülü.

İki mod destekler:
  1. LIVE mod: Gerçek ağ arayüzünü dinler (root/admin gerektirir)
  2. MOCK mod: Scapy yoksa veya izin yoksa sahte paketler üretir

Kullanım:
  sniffer = PacketSniffer()
  async for packet_info in sniffer.stream():
      print(packet_info)
"""

import asyncio
import random
import time
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncGenerator, Optional

# Scapy opsiyonel - yoksa mock mod çalışır
try:
    from scapy.all import sniff, IP, TCP, UDP, ICMP
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    print("[SNIFFER] Scapy bulunamadı — mock mod aktif.")


@dataclass
class PacketInfo:
    """Yakalanan paket bilgisi."""
    timestamp: str
    source_ip: str
    destination_ip: str
    protocol: str
    src_port: int
    dst_port: int
    size: int          # bytes
    flags: str         # TCP flags veya "-"
    ttl: int

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "protocol": self.protocol,
            "src_port": self.src_port,
            "dst_port": self.dst_port,
            "size": self.size,
            "flags": self.flags,
            "ttl": self.ttl,
        }


# Mock veri havuzu
_MOCK_IPS = [
    "192.168.1.10", "192.168.1.25", "192.168.1.100", "192.168.1.254",
    "10.0.0.1", "10.0.0.5", "10.0.0.12", "10.0.0.254",
    "172.16.0.10", "172.16.0.44", "172.16.0.99",
    "45.33.32.156", "93.184.216.34", "8.8.8.8", "1.1.1.1",
    "185.220.101.1", "23.129.64.100",  # Şüpheli IP'ler
]
_PROTOCOLS = ["TCP", "UDP", "ICMP", "DNS", "HTTP", "HTTPS", "SSH", "TCP_SYN"]
_TCP_FLAGS = ["S", "SA", "A", "FA", "PA", "R", "RA", "SYN_FLOOD"]


def _parse_scapy_packet(pkt) -> Optional[PacketInfo]:
    """Scapy paketinden PacketInfo oluştur."""
    if not pkt.haslayer(IP):
        return None

    ip = pkt[IP]
    proto = "OTHER"
    src_port = 0
    dst_port = 0
    flags = "-"

    if pkt.haslayer(TCP):
        proto = "TCP"
        src_port = pkt[TCP].sport
        dst_port = pkt[TCP].dport
        flags = str(pkt[TCP].flags)
    elif pkt.haslayer(UDP):
        proto = "UDP"
        src_port = pkt[UDP].sport
        dst_port = pkt[UDP].dport
    elif pkt.haslayer(ICMP):
        proto = "ICMP"

    # Bilinen port → protokol adı
    port_map = {80: "HTTP", 443: "HTTPS", 53: "DNS", 22: "SSH"}
    if dst_port in port_map:
        proto = port_map[dst_port]

    return PacketInfo(
        timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3],
        source_ip=ip.src,
        destination_ip=ip.dst,
        protocol=proto,
        src_port=src_port,
        dst_port=dst_port,
        size=len(pkt),
        flags=flags,
        ttl=ip.ttl,
    )


def _generate_mock_packet() -> PacketInfo:
    """Gerçekçi sahte paket üret."""
    proto = random.choice(_PROTOCOLS)
    is_suspicious = random.random() < 0.25  # %25 şüpheli

    if is_suspicious:
        src = random.choice(_MOCK_IPS[-2:])  # Şüpheli IP
        dst_port = random.choice([22, 23, 3389, 4444, 8080, 1433])
        flags = random.choice(["SYN_FLOOD", "R", "S"])
    else:
        src = random.choice(_MOCK_IPS[:8])
        dst_port = random.choice([80, 443, 53, 8080, 22])
        flags = random.choice(_TCP_FLAGS[:5])

    return PacketInfo(
        timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3],
        source_ip=src,
        destination_ip=random.choice(_MOCK_IPS[3:11]),
        protocol=proto,
        src_port=random.randint(1024, 65535),
        dst_port=dst_port,
        size=random.randint(40, 1500),
        flags=flags if "TCP" in proto else "-",
        ttl=random.choice([64, 128, 255, 32]),
    )


class PacketSniffer:
    """Ağ paket yakalayıcı."""

    def __init__(self, interface: Optional[str] = None, use_mock: bool = False):
        self.interface = interface
        self.use_mock = use_mock or not SCAPY_AVAILABLE
        self._running = False
        self._packet_queue: asyncio.Queue[PacketInfo] = asyncio.Queue(maxsize=1000)

        mode = "MOCK" if self.use_mock else f"LIVE ({interface or 'default'})"
        print(f"[SNIFFER] Başlatıldı — mod: {mode}")

    async def stream(self, interval: float = 0.5) -> AsyncGenerator[PacketInfo, None]:
        """
        Paket akışı üret.

        Args:
            interval: Mock modda paketler arası bekleme (saniye)
        """
        self._running = True

        if self.use_mock:
            while self._running:
                yield _generate_mock_packet()
                # Rastgele aralık — gerçekçi trafik simülasyonu
                await asyncio.sleep(interval * random.uniform(0.3, 1.5))
        else:
            # Scapy sniffer'ı ayrı thread'de çalıştır
            loop = asyncio.get_event_loop()
            asyncio.ensure_future(self._live_capture(loop))
            while self._running:
                try:
                    pkt = await asyncio.wait_for(
                        self._packet_queue.get(), timeout=2.0
                    )
                    yield pkt
                except asyncio.TimeoutError:
                    continue

    async def _live_capture(self, loop):
        """Scapy ile canlı paket yakala (ayrı thread)."""
        def _callback(pkt):
            info = _parse_scapy_packet(pkt)
            if info:
                try:
                    self._packet_queue.put_nowait(info)
                except asyncio.QueueFull:
                    pass  # Kuyruk doluysa atla

        await loop.run_in_executor(
            None,
            lambda: sniff(
                iface=self.interface,
                prn=_callback,
                store=False,
                stop_filter=lambda _: not self._running,
            ),
        )

    def stop(self):
        """Yakalamayı durdur."""
        self._running = False
        print("[SNIFFER] Durduruldu.")
