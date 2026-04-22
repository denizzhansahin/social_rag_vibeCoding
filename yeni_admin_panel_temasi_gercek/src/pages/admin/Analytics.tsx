import React from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@apollo/client/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis } from 'recharts';
import { BrainCircuit, Activity, Zap, Shield, Users, Target, Fingerprint, Cpu, AlertTriangle } from 'lucide-react';
import { GET_GLOBAL_TELEMETRY_STATS, GET_USERS_WITH_STATUS, GET_ATTENDANCE_TREND, GET_GLOBAL_FEED, GET_PERSISTENT_MATCHES } from '../../api/graphql';

const COLORS = ['#00f2fe', '#00e5ff', '#00d4ff', '#00c3ff', '#00b2ff'];

export default function Analytics() {
  const { data: telemetryData, loading: telemetryLoading } = useQuery(GET_GLOBAL_TELEMETRY_STATS) as any;
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS_WITH_STATUS) as any;
  const { data: trendData, loading: trendLoading } = useQuery(GET_ATTENDANCE_TREND) as any;
  const { data: feedData } = useQuery(GET_GLOBAL_FEED) as any;
  const { data: matchData } = useQuery(GET_PERSISTENT_MATCHES) as any;

  const feedItems = feedData?.getGlobalFeed?.slice(0, 5).map((f: any) => ({
    id: f.id,
    type: f.isSystem ? 'critical' : 'info',
    msg: f.contentText,
    time: new Date(Number(f.createdAt)).toLocaleTimeString('tr-TR')
  })) || [];

  // Process Cognitive Traits
  const cognitiveData = usersData?.getUsersWithStatus?.reduce((acc: any, user: any) => {
    const profile = user.cognitiveProfile || {};
    Object.keys(profile).forEach(trait => {
      const existing = acc.find((d: any) => d.subject === trait);
      if (existing) {
        existing.A += profile[trait];
        existing.count += 1;
      } else {
        acc.push({ subject: trait, A: profile[trait], count: 1 });
      }
    });
    return acc;
  }, []).map((d: any) => ({
    subject: d.subject.charAt(0).toUpperCase() + d.subject.slice(1),
    A: Math.round(d.A / d.count) || 0,
    fullMark: 100
  })) || [
    { subject: 'Analitik', A: 80, fullMark: 100 },
    { subject: 'Yaratıcı', A: 65, fullMark: 100 },
    { subject: 'Pratik', A: 70, fullMark: 100 },
    { subject: 'Sosyal', A: 85, fullMark: 100 },
    { subject: 'Liderlik', A: 60, fullMark: 100 }
  ];

  // Process Telemetry Metrics for Scatter
  const scatterData = telemetryData?.getGlobalTelemetryStats?.map((s: any) => ({
    x: Math.round(s.avgStress * 100) || 50,
    y: Math.round(s.avgScroll) || 120,
    z: s.count,
    name: s.type
  })) || [];

  if (telemetryLoading || usersLoading || trendLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-bg">
        <div className="flex flex-col items-center gap-4">
          <Cpu className="w-12 h-12 text-electric-blue animate-pulse" />
          <span className="text-electric-blue font-mono text-sm tracking-[0.5em] animate-pulse">INTEL_ENGINE: PROCESSING_GLOBAL_DATA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-electric-blue shadow-[0_0_15px_rgba(0,242,254,0.8)]" />
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-electric-blue" />
            V-RAG INTELLIGENCE HUB
          </h1>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-3 h-3" />
            PALANTIR GOTHAM PROTOCOL ALPHA-09 ACTIVE
          </p>
        </div>
        <div className="bg-[#0d1117] border border-dark-border px-6 py-3 rounded-xl flex items-center gap-6">
          <div className="text-center border-r border-dark-border pr-6">
            <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">Global Stress</div>
            <div className="text-xl font-bold text-coral-red">
              {Math.round((telemetryData?.getGlobalTelemetryStats?.reduce((a:any, b:any) => a + b.avgStress, 0) / (telemetryData?.getGlobalTelemetryStats?.length || 1)) * 100) || 0}%
            </div>
          </div>
          <div className="text-center">
             <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">Threat Level</div>
             <div className={`text-xl font-bold uppercase ${(telemetryData?.getGlobalTelemetryStats?.some((s:any) => s.avgStress > 0.7)) ? 'text-coral-red' : 'text-neon-mint'}`}>
               {(telemetryData?.getGlobalTelemetryStats?.some((s:any) => s.avgStress > 0.7)) ? 'HIGH' : 'LOW'}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Behavioral Scatter Chart: Stress vs Speed */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-2 bg-dark-surface border border-dark-border rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Fingerprint className="w-40 h-40 text-electric-blue" />
          </div>
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-electric-blue" />
            Davranışsal Korelasyon Analizi (Stres vs Hız)
          </h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={true} />
                <XAxis type="number" dataKey="x" name="Stress" unit="%" stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Speed" unit="px/s" stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                <ZAxis type="number" dataKey="z" range={[60, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', fontSize: '12px' }} />
                <Scatter name="Telemetry Nodes" data={scatterData} fill="#00f2fe" opacity={0.6}>
                  {scatterData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-electric-blue/5 border border-electric-blue/20 rounded-lg">
            <p className="text-xs text-gray-400 font-mono uppercase">
              <span className="text-electric-blue font-bold">INFO:</span> Yüksek kaydırma hızı (px/s) genellikle düşük odaklanma ve yüksek anksiyete ile eşleşmektedir. Node büyüklüğü veri hacmini temsil eder.
            </p>
          </div>
        </motion.div>

        {/* Cognitive Radar Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-neon-mint" />
            Global Bilişsel Profil (V-Trait)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={cognitiveData}>
                <PolarGrid stroke="#30363d" />
                <PolarAngleAxis dataKey="subject" stroke="#8b949e" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar
                  name="Platform Average"
                  dataKey="A"
                  stroke="#2ed573"
                  fill="#2ed573"
                  fillOpacity={0.6}
                />
                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-[#0d1117] p-3 rounded-lg border border-dark-border text-center">
                 <div className="text-[10px] text-gray-500 uppercase font-mono">Dominant Trait</div>
                 <div className="text-sm font-bold text-neon-mint uppercase">
                   {cognitiveData.length > 0 ? (cognitiveData.reduce((prev: any, curr: any) => (prev.A > curr.A) ? prev : curr).subject) : 'YÜKLENİYOR'}
                 </div>
              </div>
             <div className="bg-[#0d1117] p-3 rounded-lg border border-dark-border text-center">
                <div className="text-[10px] text-gray-500 uppercase font-mono">System Cohesion</div>
                <div className="text-sm font-bold text-white">82%</div>
             </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Engagement Trends */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-electric-blue" />
            Operasyonel Katılım Trendi
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData?.getAttendanceTrend}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis dataKey="title" stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#8b949e" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="totalAttendance" stroke="#00f2fe" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Intelligence Feeds */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-4 bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-coral-red" />
            Anomali & İstihbarat Beslemesi
          </h2>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {feedItems.length === 0 ? (
              <div className="p-10 text-center text-gray-600 text-xs italic font-mono uppercase">Besleme Verisi Yok</div>
            ) : feedItems.map((feed: any) => (
              <div key={feed.id} className="p-3 bg-[#0d1117] border border-dark-border rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                    feed.type === 'critical' ? 'bg-coral-red/20 text-coral-red' : 'bg-electric-blue/20 text-electric-blue'
                  }`}>{feed.type}</span>
                  <span className="text-[9px] text-gray-500 font-mono">{feed.time}</span>
                </div>
                <p className="text-xs text-gray-300 font-mono leading-tight line-clamp-2">{feed.msg}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* AI Friend Recommendation Radar */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-surface border border-dark-border rounded-2xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px]" />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-pink-500" />
              Sosyal Sinerji Radarı (AI Friendships)
            </h2>
            <p className="text-gray-500 text-sm font-mono uppercase mt-1">Onboarding verileriyle semantik benzerlik tespiti</p>
          </div>
          <div className="text-xs font-mono text-gray-600 bg-pink-500/5 px-4 py-2 rounded-lg border border-pink-500/10">
            THRESHOLD: &gt;0.55
          </div>
        </div>

        {matchData?.getPersistentMatches?.length === 0 ? (
          <div className="bg-[#0d1117] border border-dark-border rounded-xl p-12 text-center">
             <div className="text-gray-600 font-mono text-sm uppercase tracking-widest italic animate-pulse">
                Henüz yeterli sosyal veri toplanmadı. Bir sonraki senkronizasyonu bekleyin...
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {matchData?.getPersistentMatches?.map((match: any, i: number) => (
              <motion.div
                key={match.id}
                whileHover={{ scale: 1.02 }}
                className="bg-[#0d1117] border border-dark-border p-5 rounded-xl hover:border-pink-500/30 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center -space-x-3">
                    <div className="w-10 h-10 rounded-full bg-electric-blue/20 border-2 border-[#0d1117] flex items-center justify-center font-bold text-sm text-electric-blue shadow-lg">
                      {(match.userAName || '?').charAt(0)}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 border-2 border-[#0d1117] flex items-center justify-center font-bold text-sm text-pink-500 shadow-lg">
                      {(match.userBName || '?').charAt(0)}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-pink-500 bg-pink-500/10 px-2 py-1 rounded border border-pink-500/20">
                    %{Math.round(match.similarityScore * 100)} UYUM
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white truncate">{match.userAName || 'Bilinmeyen'}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">X</div>
                  <div className="text-xs font-bold text-white truncate">{match.userBName || 'Bilinmeyen'}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-dark-border/50 text-[9px] font-mono text-gray-600 flex justify-between">
                   <span>ID: {match.userAId.substring(0, 5)}...</span>
                   <span>ID: {match.userBId.substring(0, 5)}...</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
