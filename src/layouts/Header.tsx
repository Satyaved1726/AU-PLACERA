import React from 'react';
import { Menu, School } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { useNavigate } from 'react-router-dom';
import anuragIconLogo from '../assets/anurag_icon_logo.png';
import type { UserRole } from '../types';

interface HeaderProps {
  role: UserRole;
  onMenuClick: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ role, onMenuClick, title }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarClick = () => {
    if (role === 'admin' || role === 'super_admin') {
      navigate('/admin/profile');
    } else {
      navigate('/student/profile');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)] select-none">
      
      {/* Left side actions */}
      <div className="flex items-center gap-3">
        {/* Toggle burger drawer on mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden h-11 w-11 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-90 transition-all cursor-pointer relative z-50 shrink-0"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-5.5 w-5.5 shrink-0" />
        </button>

        <div>
          {/* Mobile compact title vs desktop spacing */}
          <span className="lg:hidden text-xs font-black text-slate-800 tracking-tight">
            {title}
          </span>
          <h2 className="hidden lg:block text-xs font-black text-slate-800 tracking-tight uppercase tracking-wider">
            {title}
          </h2>
        </div>
      </div>

      {/* Middle logo (visible on mobile only) */}
      <div className="lg:hidden absolute left-1/2 -translate-x-1/2 pointer-events-none flex items-center">
        <img src={anuragIconLogo} alt="Anurag University Logo" className="h-7 w-auto select-none pointer-events-none" />
      </div>

      {/* Right side university branding / avatar */}
      <div className="flex items-center gap-2.5">
        {/* Department Info */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-[9px] font-black text-slate-400 shadow-sm uppercase tracking-widest">
          <span>AIML Dept</span>
        </div>

        {/* Institution Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-black uppercase text-primary shadow-sm tracking-wider">
          <School className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Anurag University</span>
        </div>

        {/* Profile Initials Avatar Button */}
        <button
          type="button"
          onClick={handleAvatarClick}
          className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary-dark flex items-center justify-center font-bold text-xs text-white shadow-sm hover:scale-[1.03] active:scale-[0.97] transition-all shrink-0 border border-white/20 select-none"
          aria-label="View placement profile"
        >
          {getInitials(profile?.full_name)}
        </button>
      </div>

    </header>
  );
};

export default Header;
