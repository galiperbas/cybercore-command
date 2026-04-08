export interface TrafficData {
  time: string;
  inbound: number;
  outbound: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  threatScore: number;
  status: 'CRITICAL' | 'MEDIUM' | 'SAFE';
}

export const generateMockTraffic = (): TrafficData[] => {
  return Array.from({ length: 20 }).map((_, i) => ({
    time: `${i}:00`,
    inbound: Math.floor(Math.random() * 5000) + 2000,
    outbound: Math.floor(Math.random() * 3000) + 1000,
  }));
};

export const mockLogs: ActivityLog[] = [
  {
    id: '1',
    timestamp: '14:22:01.442',
    sourceIp: '192.168.1.12',
    destinationIp: '10.0.0.254',
    protocol: 'UDP',
    threatScore: 88,
    status: 'CRITICAL',
  },
  {
    id: '2',
    timestamp: '14:21:58.129',
    sourceIp: '45.22.103.1',
    destinationIp: '10.0.0.12',
    protocol: 'TCP_SYN',
    threatScore: 42,
    status: 'MEDIUM',
  },
  {
    id: '3',
    timestamp: '14:21:55.901',
    sourceIp: '192.168.1.5',
    destinationIp: '8.8.8.8',
    protocol: 'DNS',
    threatScore: 8,
    status: 'SAFE',
  },
  {
    id: '4',
    timestamp: '14:20:12.001',
    sourceIp: '172.16.0.44',
    destinationIp: '10.0.0.5',
    protocol: 'HTTP',
    threatScore: 12,
    status: 'SAFE',
  },
];
