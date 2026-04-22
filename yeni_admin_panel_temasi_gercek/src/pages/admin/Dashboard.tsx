import { motion } from 'motion/react';
import { Users, UsersRound, CalendarDays, MessageSquare, Activity, Zap, AlertTriangle } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { GET_USERS_WITH_STATUS } from '../../api/graphql';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: usersData, loading, error } = useQuery(GET_USERS_WITH_STATUS) as any;
  
  if (error) {
    console.error('Dashboard GraphQL Error:', error);
  }

  const users = usersData?.getUsersWithStatus || [];
  
  const activeUsersCount = users.filter((u: any) => u.presenceStatus === 'online').length;
  const adminCount = users.filter((u: any) => u.role === 'admin').length;

  const quickStats = [
    { label: 'Toplam Kullanıcı', value: loading ? '...' : users.length, color: 'text-electric-blue' },
    { label: 'Çevrimiçi', value: loading ? '...' : activeUsersCount, color: 'text-neon-mint' },
    { label: 'Yöneticiler', value: loading ? '...' : adminCount, color: 'text-coral-red' },
  ];

  const mainActions = [
    { 
      label: 'Kullanıcı Yönetimi', 
      desc: 'Sistem kullanıcılarını ekle, sil ve düzenle', 
      icon: Users, 
      path: '/admin/users', 
      color: 'bg-electric-blue/20', 
      iconColor: 'text-electric-blue' 
    },
    { 
      label: 'Grup Yönetimi', 
      desc: 'Mentör ve katılımcı gruplarını organize et', 
      icon: UsersRound, 
      path: '/admin/groups', 
      color: 'bg-purple-500/20', 
      iconColor: 'text-purple-500' 
    },
    { 
      label: 'Etkinlik Yönetimi', 
      desc: 'Kamp etkinliklerini ve katılımı takip et', 
      icon: CalendarDays, 
      path: '/admin/events', 
      color: 'bg-emerald-500/20', 
      iconColor: 'text-emerald-500' 
    },
    { 
      label: 'V-RAG Chat', 
      desc: 'Palantir AI asistanı ile sistem analizi yap', 
      icon: MessageSquare, 
      path: '/admin/chat', 
      color: 'bg-amber-500/20', 
      iconColor: 'text-amber-500' 
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Yönetim Paneli</h1>
          <p className="text-gray-400">Vizyon Kampı V-RAG sistemine hoş geldiniz.</p>
        </div>
        <div className="flex gap-6">
          {quickStats.map(stat => (
            <div key={stat.label} className="text-right">
              <div className="text-xs font-mono text-gray-500 uppercase">{stat.label}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid for main sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mainActions.map((action, i) => (
          <motion.div
            key={action.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, translateY: -5 }}
            onClick={() => navigate(action.path)}
            className="group cursor-pointer bg-dark-surface border border-dark-border rounded-2xl p-6 flex items-start gap-6 hover:border-white/20 transition-all duration-300 shadow-xl"
          >
            <div className={`w-16 h-16 rounded-2xl ${action.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
              <action.icon className={`w-8 h-8 ${action.iconColor}`} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-electric-blue transition-colors">{action.label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{action.desc}</p>
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-white/40 group-hover:text-white transition-colors">
                YÖNETİME GİT →
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* System Status Banner */}
      <div className="bg-dark-surface/50 border border-dark-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neon-mint shadow-[0_0_8px_rgba(46,213,115,0.5)]" />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Sistem Durumu: Kararlı</span>
        </div>
        <div className="text-[10px] font-mono text-gray-600">
          V-RAG ENGINE v2.4.0-STABLE
        </div>
      </div>
    </div>
  );
}
