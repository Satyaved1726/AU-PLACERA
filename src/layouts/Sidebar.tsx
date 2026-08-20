import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Bookmark,
  Building2,
  BookOpen,
  Megaphone,
  User,
  LayoutDashboard,
  FilePlus,
  BarChart3,
  Users,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Settings,
  GraduationCap,
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { AnuragLogo } from '../components/common/AnuragLogo';
import type { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  collapsed: boolean;
  onCollapseToggle: () => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, collapsed, onCollapseToggle, onClose }) => {
  const { signOut, profile } = useAuth();

  // Admin groups structure
  const adminGroups = [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Notice Board', path: '/admin/posts', icon: ClipboardList },
        { name: 'Create Post', path: '/admin/posts/create', icon: FilePlus }
      ]
    },
    {
      label: 'Management',
      items: [
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'Students', path: '/admin/students', icon: Users }
      ]
    },
    {
      label: 'Resources',
      items: [
        { name: 'OIA', path: '/admin/oia', icon: Building2 },
        { name: 'Materials', path: '/admin/materials', icon: BookOpen },
        { name: 'Digital Notice Board', path: '/admin/announcements', icon: Megaphone }
      ]
    }
  ];

  // Student list structure
  const studentItems = [
    { name: 'Notice Board', path: '/student/notice-board', icon: ClipboardList },
    { name: 'Digital Notice Board', path: '/student/announcements', icon: Megaphone },
    { name: 'Registered', path: '/student/registered', icon: ClipboardCheck },
    { name: 'Saved', path: '/student/saved', icon: Bookmark },
    { name: 'OIA', path: '/student/oia', icon: Building2 },
    { name: 'Materials', path: '/student/materials', icon: BookOpen },
    { name: 'Profile', path: '/student/profile', icon: User }
  ];

  // Initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderNavLinks = (isDrawer = false) => {
    const isCollapsed = !isDrawer && collapsed;

    if (role === 'admin' || role === 'super_admin') {
      const groupsToRender = [...adminGroups];
      if (role === 'super_admin') {
        groupsToRender.push({
          label: 'SUPER ADMIN',
          items: [
            { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
            { name: 'Administrators', path: '/super-admin/admins', icon: Users },
            { name: 'Students', path: '/super-admin/students', icon: GraduationCap },
            { name: 'OIA Management', path: '/super-admin/oia', icon: Building2 },
            { name: 'Activity Logs', path: '/super-admin/activity', icon: ClipboardList },
            { name: 'Security', path: '/super-admin/security', icon: Shield },
            { name: 'System Settings', path: '/super-admin/settings', icon: Settings }
          ]
        });
      }

      return (
        <div className="space-y-4">
          {groupsToRender.map((group, groupIdx) => (
            <div key={group.label + groupIdx} className="space-y-1">
              {!isCollapsed && (
                <span className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  {group.label}
                </span>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    end={item.path === '/admin/posts' ? true : false}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2 text-xs font-bold rounded-xl transition-all relative group ${
                        isActive
                          ? 'text-[#D9B310] bg-slate-800/60 border border-white/5 shadow-inner'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      } ${isCollapsed ? 'justify-center' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-[#D9B310]' : 'text-slate-400 group-hover:text-slate-200'}`} />
                        {!isCollapsed && <span>{item.name}</span>}
                        {isActive && !isCollapsed && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 w-1 h-4 bg-[#D9B310] rounded-r-full"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    const finalStudentItems = profile && !profile.oia_eligible
      ? studentItems.filter(item => item.name !== 'OIA')
      : studentItems;

    return (
      <div className="space-y-0.5">
        {finalStudentItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            title={isCollapsed ? item.name : undefined}
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all relative group ${
                isActive
                  ? 'text-[#D9B310] bg-slate-800/60 border border-white/5 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-[#D9B310]' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {!isCollapsed && <span>{item.name}</span>}
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-5 bg-[#D9B310] rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    );
  };

  const getSidebarHeader = (isDrawer = false) => {
    const isCollapsed = !isDrawer && collapsed;
    return (
      <div className={`p-4.5 border-b border-white/10 flex items-center justify-between bg-primary-dark/30 ${isCollapsed ? 'justify-center' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={isCollapsed ? 'collapsed' : 'expanded'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AnuragLogo height={32} showText={!isCollapsed} light />
          </motion.div>
        </AnimatePresence>
        
        {isDrawer && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  };

  const getSidebarFooter = (isDrawer = false) => {
    const isCollapsed = !isDrawer && collapsed;
    return (
      <div className="p-3 border-t border-white/10 bg-primary-dark/45 space-y-3">
        {/* User Card */}
        <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="h-8.5 w-8.5 rounded-full bg-secondary flex items-center justify-center font-bold text-xs shrink-0 shadow-md text-white border border-white/10 select-none">
            {getInitials(profile?.full_name)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold truncate">
                {profile?.full_name || 'Loading...'}
              </p>
              <p className="text-[9px] text-slate-300 font-semibold truncate leading-none mt-0.5">
                {profile?.email || 'email@anurag.edu.in'}
              </p>
              {profile?.role === 'super_admin' && (
                <span className="inline-block px-1.5 py-0.5 mt-1 bg-secondary/80 border border-white/10 rounded text-[7px] font-bold text-white uppercase tracking-widest leading-none select-none">
                  SUPER ADMIN
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
          {/* Desktop Collapse Toggle */}
          {!isDrawer && (
            <button
              type="button"
              onClick={onCollapseToggle}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all select-none"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}

          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="flex-grow flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 hover:text-red-100 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 active:scale-95 transition-all duration-150 select-none w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  const sidebarContent = (isDrawer = false) => (
    <div className="flex flex-col h-full bg-[#0B3C5D] text-white">
      {getSidebarHeader(isDrawer)}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-5 scrollbar-none">
        {renderNavLinks(isDrawer)}
      </nav>

      {getSidebarFooter(isDrawer)}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Width-transitioned) */}
      <aside 
        className={`hidden lg:block h-screen fixed inset-y-0 left-0 z-20 border-r border-slate-200/50 shadow-sm transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-30 bg-slate-900"
            />
            {/* Slide out drawer panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 z-40 shadow-2xl"
            >
              {sidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
