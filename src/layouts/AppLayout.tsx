import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../features/auth/useAuth';
import { 
  ClipboardList, 
  Bookmark, 
  Building2, 
  BookOpen, 
  User, 
  LayoutDashboard, 
  FilePlus, 
  BarChart3, 
  Users, 
  GraduationCap, 
  Settings,
  MoreHorizontal,
  Megaphone,
  Shield,
  X
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { UserRole } from '../types';

interface AppLayoutProps {
  role: UserRole;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  
  // Collapse sidebar state for desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('au_sidebar_collapsed');
    return saved === 'true';
  });

  const location = useLocation();
  const { profile } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Persist sidebar collapse state
  useEffect(() => {
    localStorage.setItem('au_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Helper to map route path to header title
  const getHeaderTitle = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'Dashboard';
    
    // Capitalize and format
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const title = getHeaderTitle(location.pathname);

  // Close sidebar drawer automatically on navigation changes
  useEffect(() => {
    setSidebarOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Setup bottom navigation items partitions based on role
  const getMobileNav = () => {
    if (role === 'super_admin') {
      return {
        main: [
          { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
          { name: 'Admins', path: '/super-admin/admins', icon: Users },
          { name: 'Students', path: '/super-admin/students', icon: GraduationCap }
        ],
        drawer: [
          { name: 'OIA Mgmt', path: '/super-admin/oia', icon: Building2 },
          { name: 'Logs', path: '/super-admin/activity', icon: ClipboardList },
          { name: 'Security', path: '/super-admin/security', icon: Shield },
          { name: 'Settings', path: '/super-admin/settings', icon: Settings }
        ]
      };
    }
    if (role === 'admin') {
      return {
        main: [
          { name: 'Home', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Notice', path: '/admin/posts', icon: ClipboardList },
          { name: 'Create', path: '/admin/posts/create', icon: FilePlus },
          { name: 'Profile', path: '/admin/profile', icon: User }
        ],
        drawer: [
          { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
          { name: 'Students', path: '/admin/students', icon: Users },
          { name: 'OIA', path: '/admin/oia', icon: Building2 },
          { name: 'Materials', path: '/admin/materials', icon: BookOpen },
          { name: 'Announce', path: '/admin/announcements', icon: Megaphone }
        ]
      };
    }
    
    // Student navigation
    const hasOia = profile?.oia_eligible;
    const mainItems = [
      { name: 'Notice', path: '/student/notice-board', icon: ClipboardList },
      { name: 'Materials', path: '/student/materials', icon: BookOpen },
      { name: 'Profile', path: '/student/profile', icon: User }
    ];
    
    const drawerItems = [
      { name: 'Announcements', path: '/student/announcements', icon: Megaphone },
      { name: 'Saved Notices', path: '/student/saved', icon: Bookmark }
    ];
    if (hasOia) {
      drawerItems.unshift({ name: 'OIA Hub', path: '/student/oia', icon: Building2 });
    }
    
    return {
      main: mainItems,
      drawer: drawerItems
    };
  };

  const { main: mobileMainItems, drawer: mobileDrawerItems } = getMobileNav();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row relative">
      
      {/* Sidebar Navigation */}
      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div 
        className={`flex-grow flex flex-col min-w-0 pb-24 lg:pb-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        
        {/* Top Header - Sticky with Blur */}
        <Header
          role={role}
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page Container */}
        <main className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto max-w-[1400px] w-full mx-auto">
          {/* Animated Route Transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (lg:hidden) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/80 px-1 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-around items-center select-none pb-[calc(4px+env(safe-area-inset-bottom))]">
        {mobileMainItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1.5 px-2.5 text-[9px] font-bold rounded-lg transition-all duration-150 relative ${
                isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-650'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-slate-450'}`} />
                <span className="truncate max-w-[64px]">{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNav"
                    className="absolute -top-1 w-6 h-0.75 bg-secondary rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
        {/* More Button */}
        {mobileDrawerItems.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 text-[9px] font-bold rounded-lg transition-all duration-150 relative ${
              moreOpen ? 'text-primary' : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            <MoreHorizontal className={`h-5 w-5 ${moreOpen ? 'text-primary' : 'text-slate-450'}`} />
            <span>More</span>
          </button>
        )}
      </div>

      {/* More Bottom Sheet Drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Slide up sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200/80 rounded-t-3xl shadow-2xl p-6 pb-[calc(24px+env(safe-area-inset-bottom))] space-y-5 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black text-slate-800 tracking-wider uppercase">More Sections</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1 rounded-lg text-slate-450 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {mobileDrawerItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-primary/5 border-primary/20 text-primary font-bold'
                          : 'bg-slate-50/50 border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-bold text-center leading-tight truncate w-full">{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AppLayout;
