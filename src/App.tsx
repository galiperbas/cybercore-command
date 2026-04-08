/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  LayoutGrid, 
  BarChart3, 
  Terminal, 
  Bot, 
  Search, 
  Bell, 
  Settings, 
  Database, 
  HelpCircle, 
  Lock, 
  Plus, 
  Send, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Timer, 
  Router,
  TrendingUp,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { cn } from './lib/utils';
import { getAIAnalystResponse, ChatMessage } from './services/geminiService';
import { useNetworkTraffic, TrafficPoint } from './hooks/useNetworkTraffic';

// --- Sub-components ---

const Sidebar = () => {
  const [active, setActive] = useState('Dashboard');
  const menuItems = [
    { name: 'Dashboard', icon: LayoutGrid },
    { name: 'Traffic Analysis', icon: BarChart3 },
    { name: 'Threat Intel', icon: Shield },
    { name: 'Log Explorer', icon: Terminal },
    { name: 'Network Map', icon: Bot },
  ];

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-surface-container-low/80 backdrop-blur-xl border-r border-outline-variant/20 z-[60]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-primary-container flex items-center justify-center rounded-sm glow-primary">
            <Shield className="text-on-primary w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-primary font-bold font-headline uppercase tracking-widest leading-none">CYBER_CORE</span>
            <span className="text-[10px] text-primary/60 font-headline uppercase tracking-tighter">Level 4 Access</span>
          </div>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActive(item.name)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 font-headline text-sm uppercase font-bold transition-all cursor-pointer group",
                active === item.name 
                  ? "bg-primary-container/10 text-primary-container border-l-2 border-primary-container" 
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              <item.icon className={cn("w-5 h-5", active === item.name ? "text-primary-container" : "text-on-surface-variant group-hover:text-on-surface")} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-6 space-y-4">
        <button className="w-full bg-primary-container text-on-primary-container font-headline font-bold text-xs py-3 px-4 uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all glow-primary">
          DEPLOY SCAN
        </button>
        <div className="space-y-1 pt-4">
          <button className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant font-headline text-[10px] uppercase font-bold hover:text-on-surface cursor-pointer transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span>Support</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant font-headline text-[10px] uppercase font-bold hover:text-on-surface cursor-pointer transition-colors">
            <Lock className="w-4 h-4" />
            <span>Vault</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <header className="flex justify-between items-center w-full px-6 h-16 bg-surface border-b border-outline-variant/20 z-50 shadow-[0_0_20px_rgba(0,229,255,0.04)]">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-black text-primary uppercase tracking-widest font-headline">NET_COMMAND_V1</h1>
        <div className="hidden lg:flex items-center bg-surface-container-lowest border border-outline-variant/20 px-3 py-1.5 gap-2 group focus-within:border-primary-container transition-colors">
          <Search className="text-on-surface-variant w-4 h-4" />
          <input 
            className="bg-transparent border-none focus:ring-0 text-xs font-sans text-primary placeholder-outline-variant w-64" 
            placeholder="GLOBAL_SEARCH_..." 
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full border", isConnected ? "bg-secondary/10 border-secondary/20" : "bg-error/10 border-error/20")}>
          <span className={cn("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-secondary" : "bg-error")}></span>
          <span className={cn("text-[10px] font-headline font-bold uppercase tracking-wider", isConnected ? "text-secondary" : "text-error")}>
            System Status: {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Bell className="w-5 h-5 hover:text-primary-container cursor-pointer transition-colors" />
          <Settings className="w-5 h-5 hover:text-primary-container cursor-pointer transition-colors" />
          <Database className="w-5 h-5 hover:text-primary-container cursor-pointer transition-colors" />
          <button className="ml-2 px-4 py-1.5 bg-primary-container text-on-primary-container font-headline font-bold text-xs uppercase hover:brightness-110 active:scale-95 transition-all glow-primary">
            SYSTEM_UP
          </button>
        </div>
      </div>
    </header>
  );
};

const StatCard = ({ title, value, unit, trend, icon: Icon, colorClass, glowClass }: any) => (
  <div className="bg-surface-container-low p-4 relative group overflow-hidden border border-outline-variant/10">
    <div className={cn("absolute top-0 left-0 w-1 h-full", colorClass)}></div>
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-widest">{title}</span>
      <Icon className={cn("w-5 h-5", glowClass)} />
    </div>
    <div className="mt-4 flex items-end gap-2">
      <span className={cn("text-3xl font-headline font-bold tracking-tighter", glowClass ? glowClass : "text-on-surface")}>{value}</span>
      <span className="text-xs font-sans text-on-surface-variant mb-1 uppercase">{unit}</span>
    </div>
    <div className="mt-2 flex items-center gap-1 text-[10px] font-sans">
      {trend.type === 'up' ? <TrendingUp className="w-3 h-3 text-secondary" /> : <CheckCircle2 className="w-3 h-3 text-secondary" />}
      <span className={cn(trend.color)}>{trend.text}</span>
    </div>
  </div>
);

const TrafficChart = ({ data }: { data: TrafficPoint[] }) => (
  <div className="bg-surface-container-low border border-outline-variant/10">
    <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center">
      <div>
        <h2 className="text-xs font-headline font-bold uppercase tracking-widest text-primary">Network Traffic Volume</h2>
        <p className="text-[10px] text-on-surface-variant font-sans">Real-time inbound/outbound packet stream (pps)</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-container"></span>
          <span className="text-[10px] font-headline font-bold uppercase text-on-surface-variant">Inbound</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="text-[10px] font-headline font-bold uppercase text-on-surface-variant">Outbound</span>
        </div>
      </div>
    </div>
    <div className="h-64 p-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3b494c" vertical={false} opacity={0.1} />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#3b494c', fontSize: 8, fontFamily: 'JetBrains Mono' }} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#3b494c', fontSize: 8, fontFamily: 'JetBrains Mono' }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1c2026', border: '1px solid #3b494c', borderRadius: '4px' }}
            itemStyle={{ fontSize: '10px', fontFamily: 'Space Grotesk', textTransform: 'uppercase' }}
          />
          <Bar dataKey="inbound" fill="#00e5ff" radius={[2, 2, 0, 0]} />
          <Bar dataKey="outbound" fill="#40e56c" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const AIAnalyst = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Neural engine online. Monitoring all traffic streams for anomalies. How can I assist with your diagnostic today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await getAIAnalystResponse(input, messages);
    
    const modelMsg: ChatMessage = {
      role: 'model',
      text: response,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isDiagnostic: response.toLowerCase().includes('diagnostic') || response.toLowerCase().includes('threat score')
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  return (
    <aside className="hidden xl:flex flex-col fixed right-0 top-16 h-[calc(100vh-64px)] w-80 bg-surface-container-lowest/90 backdrop-blur-2xl border-l border-outline-variant/20 z-40">
      <div className="p-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20 glow-primary">
            <Cpu className="text-secondary w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-headline font-bold text-secondary uppercase tracking-wider">AI_ANALYST_CORES</h3>
            <p className="text-[10px] text-secondary/60 font-mono uppercase">Neural Engine Online</p>
          </div>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}
          >
            <div className={cn(
              "px-3 py-2 rounded-sm max-w-[95%] text-xs leading-relaxed",
              msg.role === 'user' 
                ? "bg-surface-container-high text-on-surface" 
                : cn("bg-secondary/5 border-l-2 border-secondary", msg.isDiagnostic && "bg-error/5 border-error")
            )}>
              {msg.role === 'model' && (
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className={cn("w-3 h-3", msg.isDiagnostic ? "text-error" : "text-secondary")} />
                  <span className={cn("text-[10px] font-headline font-bold uppercase", msg.isDiagnostic ? "text-error" : "text-secondary")}>
                    {msg.isDiagnostic ? "Diagnostic Complete" : "System Response"}
                  </span>
                </div>
              )}
              <p className={cn(msg.role === 'model' && "font-sans")}>{msg.text}</p>
              {msg.isDiagnostic && (
                <div className="mt-3 flex gap-2">
                  <button className="text-[9px] px-2 py-1 bg-error/10 text-error border border-error/20 uppercase font-headline font-bold hover:bg-error/20 transition-all">ISOLATE HOST</button>
                  <button className="text-[9px] px-2 py-1 text-on-surface-variant hover:text-on-surface uppercase font-headline font-bold">DISMISS</button>
                </div>
              )}
            </div>
            <span className="text-[8px] font-mono text-outline-variant">{msg.timestamp}</span>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        )}
      </div>

      <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/20">
        <div className="relative flex items-center">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full bg-surface-container-low border border-outline-variant/20 py-2.5 pl-3 pr-10 text-xs font-sans text-primary-container placeholder-outline-variant focus:border-secondary transition-colors outline-none" 
            placeholder="ASK_AI_CORE..." 
            type="text"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 text-secondary hover:brightness-125 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <button className="w-full mt-3 bg-secondary/10 border border-secondary/20 text-secondary font-headline font-bold text-[10px] py-2 uppercase tracking-widest hover:bg-secondary/20 transition-all">
          INITIATE_DIAGNOSTIC
        </button>
      </div>
    </aside>
  );
};

// --- Main App ---

export default function App() {
  const { kpi, logs, trafficData, isConnected } = useNetworkTraffic();

  return (
    <div className="flex h-screen bg-background text-on-surface">
      <Sidebar />
      
      <main className="flex-1 flex flex-col md:ml-64 xl:mr-80 relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid pointer-events-none"></div>
        
        <TopBar isConnected={isConnected} />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Traffic" 
              value={kpi.total_traffic.toFixed(2)} 
              unit="Mbps" 
              trend={{ type: 'up', text: `${kpi.total_packets.toLocaleString()} packets`, color: 'text-secondary' }}
              icon={Router}
              colorClass="bg-primary-container"
              glowClass="text-primary-container"
            />
            <StatCard 
              title="Anomalies Detected" 
              value={kpi.anomaly_count} 
              unit="Incidents" 
              trend={{
                type: 'alert',
                text: kpi.critical_count > 0 ? 'CRITICAL ACTION REQUIRED' : 'Monitoring...',
                color: kpi.critical_count > 0 ? 'text-error animate-pulse' : 'text-secondary'
              }}
              icon={AlertTriangle}
              colorClass="bg-error-container"
              glowClass="text-error"
            />
            <StatCard 
              title="Normal Traffic" 
              value={kpi.normal_count} 
              unit="Packets" 
              trend={{ type: 'check', text: 'Classification active', color: 'text-secondary' }}
              icon={CheckCircle2}
              colorClass="bg-outline-variant"
            />
            <StatCard 
              title="Active Threats" 
              value={kpi.critical_count} 
              unit="Critical" 
              trend={{ type: 'check', text: isConnected ? 'Engine online' : 'DISCONNECTED', color: isConnected ? 'text-secondary' : 'text-error' }}
              icon={Shield}
              colorClass="bg-primary-container"
              glowClass="text-primary-container"
            />
          </div>

          {/* Traffic Chart */}
          <TrafficChart data={trafficData} />

          {/* Activity Logs */}
          <div className="bg-surface-container-low border border-outline-variant/10">
            <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="text-xs font-headline font-bold uppercase tracking-widest text-error">Suspicious Activity Logs</h2>
              <button className="flex items-center gap-2 text-[10px] font-headline font-bold text-primary-container uppercase hover:underline">
                <Download className="w-3 h-3" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-outline-variant/10">
                    <th className="px-6 py-3 text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-wider">Source IP</th>
                    <th className="px-6 py-3 text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-wider">Destination IP</th>
                    <th className="px-6 py-3 text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-wider">Protocol</th>
                    <th className="px-6 py-3 text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-wider">Threat Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-highest/30 transition-colors group">
                      <td className="px-6 py-3 text-xs font-mono text-primary-container">{log.timestamp}</td>
                      <td className="px-6 py-3 text-xs font-mono">{log.source_ip}</td>
                      <td className="px-6 py-3 text-xs font-mono">{log.destination_ip}</td>
                      <td className="px-6 py-3 text-xs font-headline font-bold uppercase">{log.protocol}</td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-headline font-bold border",
                          log.status === 'CRITICAL' ? "bg-error-container/20 text-error border-error/20" :
                          log.status === 'MEDIUM' ? "bg-primary-container/10 text-primary-container border-primary-container/20" :
                          "bg-secondary/10 text-secondary border-secondary/20"
                        )}>
                          {log.threat_score} / {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Floating Action Button */}
        <button className="fixed bottom-6 right-6 md:right-8 lg:right-96 xl:mr-80 w-14 h-14 bg-primary-container text-on-primary-container rounded-sm shadow-[0_0_30px_rgba(0,229,255,0.3)] flex items-center justify-center group active:scale-95 transition-all z-[70]">
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" />
        </button>
      </main>

      <AIAnalyst />
    </div>
  );
}
