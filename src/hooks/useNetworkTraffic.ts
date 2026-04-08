/**
 * useNetworkTraffic.ts
 *
 * FastAPI WebSocket endpoint'ine bağlanarak canlı veri akışı sağlar.
 * KPI, log ve trafik verilerini state olarak tutar.
 *
 * Kullanım:
 *   const { kpi, logs, trafficData, isConnected } = useNetworkTraffic();
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// --- Tipler ---
export interface KpiData {
  total_traffic: number;
  total_packets: number;
  anomaly_count: number;
  normal_count: number;
  critical_count: number;
  uptime_seconds: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  protocol: string;
  threat_score: number;
  status: 'CRITICAL' | 'MEDIUM' | 'SAFE';
  label: string;
  attack_type: string;
  confidence: number;
  packet_size: number;
  flags: string;
}

export interface TrafficPoint {
  time: string;
  inbound: number;
  outbound: number;
}

interface WSMessage {
  type: 'kpi' | 'log' | 'logs_init' | 'traffic';
  data: any;
}

// --- Hook ---
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
const MAX_LOGS = 100;
const RECONNECT_DELAY = 3000;

export function useNetworkTraffic() {
  const [kpi, setKpi] = useState<KpiData>({
    total_traffic: 0,
    total_packets: 0,
    anomaly_count: 0,
    normal_count: 0,
    critical_count: 0,
    uptime_seconds: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Bağlantı kuruldu:', WS_URL);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'kpi':
            setKpi(msg.data);
            break;

          case 'log':
            setLogs((prev) => [msg.data, ...prev].slice(0, MAX_LOGS));
            break;

          case 'logs_init':
            setLogs(msg.data);
            break;

          case 'traffic':
            setTrafficData(msg.data);
            break;
        }
      } catch (err) {
        console.error('[WS] Mesaj parse hatası:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Bağlantı kapandı. Yeniden denenecek...');
      setIsConnected(false);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = (err) => {
      console.error('[WS] Hata:', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { kpi, logs, trafficData, isConnected };
}
