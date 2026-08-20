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
  Settings 
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { UserRole } from '../types';

interface AppLayoutProps {
  role: UserRole;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
  }, [location.pathname]);

  // Student bottom navigation items (mobile-first thumb reachable)
  const studentBottomNav = [
    { name: 'Notice', path: '/student/notice-board', icon: ClipboardList },
    { name: 'Saved', path: '/student/saved', icon: Bookmark },
    { name: 'OIA', path: '/student/oia', icon: Building2 },
    { name: 'Materials', path: '/student/materials', icon: BookOpen },
    { name: 'Profile', path: '/student/profile', icon: User }
  ];

  // Admin bottom navigation items
  const adminBottomNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Notice', path: '/admin/posts', icon: ClipboardList },
    { name: 'Create', path: '/admin/posts/create', icon: FilePlus },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Profile', path: '/admin/profile', icon: User }
  ];

  // Super Admin bottom navigation items
  const superAdminBottomNav = [
    { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
    { name: 'Admins', path: '/super-admin/admins', icon: Users },
    { name: 'Students', path: '/super-admin/students', icon: GraduationCap },
    { name: 'Logs', path: '/super-admin/activity', icon: ClipboardList },
    { name: 'Settings', path: '/super-admin/settings', icon: Settings }
  ];

  const getBottomNavItems = () => {
    if (role === 'super_admin') return superAdminBottomNav;
    if (role === 'admin') return adminBottomNav;
    if (profile && !profile.oia_eligible) {
      return studentBottomNav.filter(item => item.name !== 'OIA');
    }
    return studentBottomNav;
  };

  const bottomNavItems = getBottomNavItems();

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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200/80 px-1 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-around items-center select-none pb-[calc(4px+env(safe-area-inset-bottom))]">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 text-[9px] font-bold rounded-lg transition-all duration-150 relative ${
                isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-650'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-primary' : 'text-slate-450'}`} />
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
      </div>
    </div>
  );
};
export default AppLayout;
