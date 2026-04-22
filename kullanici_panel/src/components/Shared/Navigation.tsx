import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Calendar, User, LayoutDashboard, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function Navigation() {
  const { user } = useAuth();
  const isMentor = user && ['mentor', 'teacher'].includes(user.role!);
  const isAdmin = user && user.role === 'admin';

  const navItems = [
    { to: '/feed', icon: Home, label: 'Akış' },
    { to: '/group', icon: Users, label: 'Grubum' },
    { to: '/events', icon: Calendar, label: 'Etkinlikler' },
    { to: `/profile/${user?.id || 'me'}`, icon: User, label: 'Profil' },
  ];

  // Mentörler: Mentör Paneli
  if (isMentor) {
    navItems.push({ to: '/mentor-dashboard', icon: LayoutDashboard, label: 'Yönetim' });
  }

  // Adminler: Admin Panel
  if (isAdmin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1117]/95 backdrop-blur-xl border-t border-[#30363d] pb-safe z-50">
      <div className="max-w-xl mx-auto flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200",
              isActive ? "text-[#58a6ff]" : "text-[#8b949e] hover:text-[#c9d1d9]"
            )}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                  {isActive && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#58a6ff]" />
                  )}
                </div>
                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
