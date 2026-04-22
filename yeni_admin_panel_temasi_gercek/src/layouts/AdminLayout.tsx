import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Network, Activity, Terminal, LogOut, UsersRound, CalendarDays, ClipboardList, PanelTopDashed } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Panel', path: '/admin/dashboard' },
  { icon: Activity, label: 'İstihbarat', path: '/admin/analytics' },
  { icon: Users, label: 'Kullanıcılar', path: '/admin/users' },
  { icon: UsersRound, label: 'Gruplar', path: '/admin/groups' },
  { icon: Network, label: 'Sosyal Sinerji', path: '/admin/synergy' },
  { icon: Network, label: 'Ağ Haritası', path: '/admin/network' },
  { icon: CalendarDays, label: 'Etkinlikler', path: '/admin/events' },
  { icon: ClipboardList, label: 'Onboarding', path: '/admin/onboarding' },
  { icon: PanelTopDashed, label: 'İçerik Denetimi', path: '/admin/feed' },
  { icon: Terminal, label: 'V-RAG Terminal', path: '/admin/chat' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('Admin');
  const [userRole, setUserRole] = useState('admin');

  useEffect(() => {
    // Get user info from localStorage (set during login)
    const email = localStorage.getItem('vrag_admin_email');
    const role = localStorage.getItem('vrag_admin_role');
    
    if (email) setUserEmail(email);
    if (role) setUserRole(role);
  }, []);

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('vrag_admin_jwt');
    localStorage.removeItem('vrag_admin_email');
    localStorage.removeItem('vrag_admin_role');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-dark-border bg-dark-surface flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-electric-blue/10 border border-electric-blue/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-electric-blue" />
            </div>
            <span className="font-bold text-white tracking-wider">PALANTIR</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-electric-blue/10 text-electric-blue"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-gray-400 hover:bg-coral-red/10 hover:text-coral-red transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-dark-border bg-dark-surface/50 backdrop-blur-md flex items-center justify-between px-8 absolute top-0 w-full z-10">
          <div className="flex items-center gap-2 text-sm font-mono text-gray-500">
            <span className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
            SYSTEM ONLINE
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-white">{userEmail.split('@')[0]}</div>
              <div className="text-xs text-gray-500 font-mono">{userRole.toUpperCase()}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-900 border border-electric-blue/30 flex items-center justify-center text-electric-blue font-bold">
              {userEmail.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto pt-16 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
