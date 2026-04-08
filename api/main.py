"""
main.py - FastAPI uygulaması.

WebSocket üzerinden gerçek zamanlı anomali tespiti yayını yapar.

Çalıştırma:
  uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
"""

import asyncio
import json
import time
from collections import deque
from datetime import datetime
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .model import detector, Prediction
from .sniffer import PacketSniffer, PacketInfo

# ═══════════════════════════════════════════════════════════════
# App
# ═══════════════════════════════════════════════════════════════
app = FastAPI(
    title="CyberCore Command API",
    description="Near real-time ağ anomali tespit backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════
# State
# ═══════════════════════════════════════════════════════════════
connected_clients: Set[WebSocket] = set()
sniffer = PacketSniffer(use_mock=True)  # Mock mod — canlı için False yapın

# Son N log kaydı (yeni bağlanan client'a göndermek için)
recent_logs: deque = deque(maxlen=50)

# KPI sayaçları
kpi = {
    "total_packets": 0,
    "total_bytes": 0,
    "anomaly_count": 0,
    "normal_count": 0,
    "critical_count": 0,
    "start_time": time.time(),
}

# Trafik zaman serisi (son 20 pencere)
traffic_windows: deque = deque(maxlen=20)
_current_window = {"inbound": 0, "outbound": 0, "time": ""}


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════
def _classify_status(score: int) -> str:
    if score >= 70:
        return "CRITICAL"
    elif score >= 35:
        return "MEDIUM"
    return "SAFE"


def _build_log_entry(pkt: PacketInfo, pred: Prediction) -> dict:
    return {
        "id": f"{kpi['total_packets']}",
        "timestamp": pkt.timestamp,
        "source_ip": pkt.source_ip,
        "destination_ip": pkt.destination_ip,
        "protocol": pkt.protocol,
        "threat_score": pred.threat_score,
        "status": _classify_status(pred.threat_score),
        "label": pred.label,
        "attack_type": pred.attack_type,
        "confidence": pred.confidence,
        "packet_size": pkt.size,
        "flags": pkt.flags,
    }


def _build_kpi_message() -> dict:
    elapsed = max(time.time() - kpi["start_time"], 1)
    throughput_mbps = round((kpi["total_bytes"] * 8) / (elapsed * 1_000_000), 2)

    return {
        "type": "kpi",
        "data": {
            "total_traffic": throughput_mbps,
            "total_packets": kpi["total_packets"],
            "anomaly_count": kpi["anomaly_count"],
            "normal_count": kpi["normal_count"],
            "critical_count": kpi["critical_count"],
            "uptime_seconds": int(elapsed),
        },
    }


async def broadcast(message: dict):
    """Tüm bağlı client'lara mesaj gönder."""
    dead = set()
    payload = json.dumps(message)
    for ws in connected_clients:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    connected_clients.difference_update(dead)


# ═══════════════════════════════════════════════════════════════
# Background: paket işleme döngüsü
# ═══════════════════════════════════════════════════════════════
async def packet_processing_loop():
    """Ana döngü: yakala → tahmin et → yayınla."""
    global _current_window

    window_interval = 5  # Her 5 saniyede bir trafik penceresi
    last_window_time = time.time()

    async for pkt in sniffer.stream(interval=0.4):
        # Model tahmini
        pred = detector.predict(pkt.to_dict())

        # KPI güncelle
        kpi["total_packets"] += 1
        kpi["total_bytes"] += pkt.size
        if pred.label == "ANOMALY":
            kpi["anomaly_count"] += 1
            if pred.threat_score >= 70:
                kpi["critical_count"] += 1
        else:
            kpi["normal_count"] += 1

        # Trafik penceresi
        _current_window["inbound"] += pkt.size if pkt.src_port > 1024 else 0
        _current_window["outbound"] += pkt.size if pkt.src_port <= 1024 else 0

        now = time.time()
        if now - last_window_time >= window_interval:
            _current_window["time"] = datetime.now().strftime("%H:%M:%S")
            traffic_windows.append(dict(_current_window))
            _current_window = {"inbound": 0, "outbound": 0, "time": ""}
            last_window_time = now

            # Trafik verisi yayınla
            await broadcast({
                "type": "traffic",
                "data": list(traffic_windows),
            })

        # Log girişi oluştur
        log_entry = _build_log_entry(pkt, pred)
        recent_logs.appendleft(log_entry)

        # Anomali veya her 5 pakette bir log yayınla
        if pred.label == "ANOMALY" or kpi["total_packets"] % 5 == 0:
            await broadcast({
                "type": "log",
                "data": log_entry,
            })

        # KPI her 3 saniyede güncelle
        if kpi["total_packets"] % 8 == 0:
            await broadcast(_build_kpi_message())


# ═══════════════════════════════════════════════════════════════
# Lifecycle
# ═══════════════════════════════════════════════════════════════
@app.on_event("startup")
async def startup():
    asyncio.create_task(packet_processing_loop())
    print("[API] CyberCore backend başlatıldı.")


@app.on_event("shutdown")
async def shutdown():
    sniffer.stop()
    print("[API] CyberCore backend durduruldu.")


# ═══════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════
@app.get("/")
async def root():
    return {
        "service": "CyberCore Command API",
        "status": "online",
        "model": "mock" if detector.is_mock else "xgboost",
        "packets_processed": kpi["total_packets"],
    }


@app.get("/api/kpi")
async def get_kpi():
    """Güncel KPI metrikleri."""
    return _build_kpi_message()


@app.get("/api/logs")
async def get_logs():
    """Son log kayıtları."""
    return {"logs": list(recent_logs)}


@app.get("/api/traffic")
async def get_traffic():
    """Trafik zaman serisi."""
    return {"data": list(traffic_windows)}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    WebSocket endpoint — canlı veri akışı.

    Mesaj tipleri:
      - "kpi": KPI metrikleri
      - "log": Yeni log girişi (anomali veya periyodik)
      - "traffic": Trafik zaman serisi penceresi
    """
    await ws.accept()
    connected_clients.add(ws)
    print(f"[WS] Client bağlandı. Toplam: {len(connected_clients)}")

    # İlk bağlantıda mevcut verileri gönder
    try:
        await ws.send_text(json.dumps(_build_kpi_message()))
        await ws.send_text(json.dumps({
            "type": "logs_init",
            "data": list(recent_logs),
        }))
        if traffic_windows:
            await ws.send_text(json.dumps({
                "type": "traffic",
                "data": list(traffic_windows),
            }))
    except Exception:
        pass

    # Bağlantı açık kalsın
    try:
        while True:
            # Client'tan gelen mesajları dinle (chatbot için kullanılabilir)
            data = await ws.receive_text()
            # Şimdilik echo — ileride AI chatbot entegrasyonu
    except WebSocketDisconnect:
        connected_clients.discard(ws)
        print(f"[WS] Client ayrıldı. Toplam: {len(connected_clients)}")
