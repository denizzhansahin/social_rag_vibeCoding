import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@apollo/client/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie
} from 'recharts';
import { 
  BrainCircuit, Activity, Zap, Shield, Users, Target, Fingerprint, 
  Cpu, AlertTriangle, Eye, Clock, MapPin, HeartPulse, Sparkles,
  TrendingUp, Search, Filter, Share2, Download, Maximize2
} from 'lucide-react';
import { GET_GLOBAL_TELEMETRY_STATS, GET_USERS_WITH_STATUS } from '../../api/graphql';

const COLORS = ['#00f2fe', '#2ed573', '#ffa502', '#ff4757', '#70a1ff', '#5352ed'];

export default function TelemetryAnalytics() {
  const { data: telemetryData, loading: telemetryLoading } = useQuery(GET_GLOBAL_TELEMETRY_STATS) as any;
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS_WITH_STATUS) as any;
  const [activeTab, setActiveTab] = useState('behavioral');

  // Process Mock/Real Data for 50 Data Points visualization
  const behavioralScatter = telemetryData?.getGlobalTelemetryStats?.map((s: any) => ({
    x: Math.round(s.avgStress * 100) || 45,
    y: Math.round(s.avgScroll) || 110,
    z: s.count,
    name: s.type
  })) || [
    { x: 45, y: 120, z: 400, name: 'Normal' },
    { x: 75, y: 250, z: 120, name: 'High Speed' },
    { x: 30, y: 80, z: 200, name: 'Deep Focus' }
  ];

  const cognitiveRadar = [
    { subject: 'Analitik', A: 85, fullMark: 100 },
    { subject: 'Yaratıcı', A: 70, fullMark: 100 },
    { subject: 'Pratik', A: 90, fullMark: 100 },
    { subject: 'Sosyal', A: 65, fullMark: 100 },
    { subject: 'Liderlik', A: 75, fullMark: 100 },
    { subject: 'Duygusal', A: 80, fullMark: 100 }
  ];

  const socialActivity = [
    { time: '08:00', active: 45, events: 12 },
    { time: '10:00', active: 380, events: 85 },
    { time: '12:00', active: 320, events: 40 },
    { time: '14:00', active: 395, events: 110 },
    { time: '16:00', active: 310, events: 65 },
    { time: '18:00', active: 150, events: 30 },
    { time: '20:00', active: 280, events: 95 },
    { time: '22:00', active: 340, events: 150 },
    { time: '00:00', active: 110, events: 45 },
  ];

  const anomalyFeed = [
    { id: 1, type: 'CRITICAL', title: 'Stress Anomali Saptandı', desc: 'Grup-4 stres endeksi %85 eşiğini aştı. Kök neden: Uykusuzluk + Mentor Uyuşmazlığı.', time: '2dk Önce', icon: AlertTriangle, color: 'text-coral-red' },
    { id: 2, type: 'INSIGHT', title: 'Gölge Lider Tespiti', desc: 'Resmi görevi olmayan @denizhan, gönderileriyle kitlenin %40ını yönlendiriyor.', time: '15dk Önce', icon: BrainCircuit, color: 'text-neon-mint' },
    { id: 3, type: 'WARNING', title: 'Dikkat Dağınıklığı', desc: 'Ana salonda telefon ekranı açık kalma süresi ortalaması 12dk/saat. (Yüksek)', time: '40dk Önce', icon: Activity, color: 'text-electric-blue' },
    { id: 4, type: 'STABLE', title: 'Sistem Kohezyonu', desc: 'Gruplar arası etkileşim %22 artış gösterdi. Köprü düğümler aktif.', time: '1s Önce', icon: Shield, color: 'text-blue-400' },
  ];

  if (telemetryLoading || usersLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-dark-bg space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-electric-blue/20 border-t-electric-blue rounded-full animate-spin" />
          <Cpu className="w-6 h-6 text-electric-blue absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-electric-blue font-mono text-sm tracking-[0.3em] animate-pulse uppercase">
          Initializing Palantir Gotham Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-electric-blue shadow-[0_0_20px_rgba(0,242,254,0.6)] rounded-full" />
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Radio className="w-8 h-8 text-electric-blue" />
            TELEMETRY INTELLIGENCE
          </h1>
          <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
            <Shield className="w-3 h-3 text-neon-mint" />
            Active Surveillance Protocol: V-RAG 2.0
          </p>
        </div>

        <div className="flex items-center gap-2 bg-dark-surface border border-dark-border p-1 rounded-xl">
          {['behavioral', 'social', 'cognitive'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab 
                ? 'bg-electric-blue text-dark-bg shadow-[0_0_15px_rgba(0,242,254,0.3)]' 
                : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Global Stress Index', val: '42%', trend: '-4%', icon: HeartPulse, color: 'text-coral-red' },
          { label: 'Engagement Velocity', val: '1.2k/h', trend: '+12%', icon: TrendingUp, color: 'text-neon-mint' },
          { label: 'Network Cohesion', val: '0.84', trend: '+0.02', icon: Activity, color: 'text-electric-blue' },
          { label: 'Active Data Points', val: '50/50', trend: 'MAX', icon: Database, color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-dark-surface border border-dark-border p-5 rounded-2xl relative overflow-hidden group hover:border-electric-blue/30 transition-colors"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-16 h-16" />
            </div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="flex items-end gap-3">
              <div className="text-2xl font-bold text-white">{stat.val}</div>
              <div className={`text-[10px] font-bold mb-1 ${stat.trend.startsWith('+') ? 'text-neon-mint' : 'text-coral-red'}`}>
                {stat.trend}
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-dark-bg rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ duration: 1.5, delay: 0.5 }}
                 className={`h-full bg-gradient-to-r from-transparent to-current ${stat.color.replace('text-', 'bg-')}`} 
               />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analytics Area */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'behavioral' && (
              <motion.div 
                key="behavioral"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="bg-dark-surface border border-dark-border rounded-2xl p-8"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                       <Zap className="w-5 h-5 text-electric-blue" />
                       Behavioral Correlation (Stress/Speed)
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Scroll velocity vs. detected physiological stress indicators.</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-dark-bg border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"><Maximize2 className="w-4 h-4" /></button>
                    <button className="p-2 bg-dark-bg border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                      <XAxis type="number" dataKey="x" name="Stress" unit="%" stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis type="number" dataKey="y" name="Speed" unit="px/s" stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                      <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                      <Scatter name="Users" data={behavioralScatter}>
                        {behavioralScatter.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} stroke={COLORS[index % COLORS.length]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8 p-4 bg-electric-blue/5 border border-electric-blue/20 rounded-xl flex gap-4 items-center">
                  <div className="p-3 bg-electric-blue/10 rounded-lg">
                    <BrainCircuit className="w-6 h-6 text-electric-blue" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-electric-blue uppercase tracking-widest">AI Insight</div>
                    <p className="text-xs text-gray-300 font-mono">High scroll velocity (250px/s+) detected in 12% of participants correlates with "Information Overload" signals.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'social' && (
              <motion.div 
                key="social"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="bg-dark-surface border border-dark-border rounded-2xl p-8"
              >
                 <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                       <Users className="w-5 h-5 text-neon-mint" />
                       Network Engagement Cycles
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Real-time user presence and interaction frequency.</p>
                  </div>
                </div>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={socialActivity}>
                      <defs>
                        <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2ed573" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2ed573" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                      <XAxis dataKey="time" stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="active" stroke="#2ed573" fillOpacity={1} fill="url(#colorSocial)" strokeWidth={3} />
                      <Area type="monotone" dataKey="events" stroke="#00f2fe" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Deep Analysis Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-surface border border-dark-border p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-neon-mint" />
                Root-Cause Diagnosis
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-[#0d1117] rounded-xl border-l-4 border-coral-red">
                  <div className="text-[10px] text-coral-red font-bold uppercase mb-1">Energy Drop Detected</div>
                  <p className="text-xs text-gray-400 leading-relaxed font-mono">
                    "Group-7 energy dropped 30%. 80% of members were active until 02:00 AM. 
                    Root Cause: Sleep Deprivation + High Cognitive Load during morning session."
                  </p>
                </div>
                <div className="p-3 bg-[#0d1117] rounded-xl border-l-4 border-neon-mint">
                  <div className="text-[10px] text-neon-mint font-bold uppercase mb-1">Peer Compatibility</div>
                  <p className="text-xs text-gray-400 leading-relaxed font-mono">
                    "Matching @UserA (Analytic) with @UserB (Creative) resulted in 42% higher 
                    project output quality compared to baseline groups."
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-dark-surface border border-dark-border p-6 rounded-2xl">
               <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-electric-blue" />
                Transformation Index
              </h3>
              <div className="flex items-center justify-center h-[140px] relative">
                 <div className="text-4xl font-bold text-white">+24%</div>
                 <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <BrainCircuit className="w-32 h-32 text-electric-blue translate-y-2" />
                 </div>
                 <div className="absolute bottom-0 text-[10px] text-gray-500 font-mono uppercase text-center w-full">
                    Average Cognitive Shift since Day 1
                 </div>
              </div>
              <div className="mt-4 flex gap-2">
                 {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 4 ? 'bg-electric-blue' : 'bg-dark-bg'}`} />)}
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Side Feed */}
        <div className="space-y-6">
           <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-coral-red" />
                  Intel Feed
                </h2>
                <div className="px-2 py-1 bg-coral-red/10 border border-coral-red/20 rounded text-[9px] font-bold text-coral-red uppercase font-mono">
                   Live
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[700px]">
                {anomalyFeed.map((item) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-[#0d1117] border border-dark-border rounded-xl group hover:border-gray-500 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-dark-bg border border-dark-border group-hover:scale-110 transition-transform`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${item.color}`}>{item.type}</span>
                          <span className="text-[9px] text-gray-500 font-mono">{item.time}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1">{item.title}</h4>
                        <p className="text-[10px] text-gray-400 leading-relaxed font-mono opacity-80 group-hover:opacity-100">{item.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <button className="w-full py-4 bg-dark-bg border border-dashed border-dark-border rounded-xl text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:border-electric-blue hover:text-electric-blue transition-all">
                   View Full Intel Log
                </button>
              </div>

              {/* Cognitive Distribution Preview */}
              <div className="mt-8 pt-8 border-t border-dark-border">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 font-mono">Psychological Distribution</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={cognitiveRadar}>
                      <PolarGrid stroke="#30363d" />
                      <PolarAngleAxis dataKey="subject" stroke="#8b949e" fontSize={9} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                      <Radar
                        name="Platform"
                        dataKey="A"
                        stroke="#00f2fe"
                        fill="#00f2fe"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-dark-surface border border-dark-border p-3 rounded-lg shadow-2xl">
        <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">{data.name} Group</div>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] text-coral-red uppercase font-mono">Stress</div>
            <div className="text-lg font-bold text-white">{data.x}%</div>
          </div>
          <div className="w-px h-8 bg-dark-border" />
          <div>
            <div className="text-[10px] text-electric-blue uppercase font-mono">Velocity</div>
            <div className="text-lg font-bold text-white">{data.y}px/s</div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

function Radio(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
    </svg>
  );
}

function Database(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
