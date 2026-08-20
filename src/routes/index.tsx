import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { Login } from '../pages/Login';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { SuperAdminGuard } from './SuperAdminGuard';

import { OiaGuard } from './OiaGuard';

// Student Pages
import { NoticeBoard as StudentNoticeBoard } from '../pages/student/NoticeBoard';
import { Saved as StudentSaved } from '../pages/student/Saved';
import { Oia as StudentOia } from '../pages/student/Oia';
import { Materials as StudentMaterials } from '../pages/student/Materials';
import { Announcements as StudentAnnouncements } from '../pages/student/Announcements';
import { Profile as StudentProfile } from '../pages/student/Profile';

// Admin Pages
import { Dashboard as AdminDashboard } from '../pages/admin/Dashboard';
import { Posts as AdminPosts } from '../pages/admin/Posts';
import { CreatePost as AdminCreatePost } from '../pages/admin/CreatePost';
import { Oia as AdminOia } from '../pages/admin/Oia';
import { Materials as AdminMaterials } from '../pages/admin/Materials';
import { Announcements as AdminAnnouncements } from '../pages/admin/Announcements';
import { Analytics as AdminAnalytics } from '../pages/admin/Analytics';
import { Students as AdminStudents } from '../pages/admin/Students';
import { Profile as AdminProfile } from '../pages/admin/Profile';

// Super Admin Pages
import { Dashboard as SuperAdminDashboard } from '../pages/super-admin/Dashboard';
import { Admins as SuperAdminAdmins } from '../pages/super-admin/Admins';
import { AdminDetail as SuperAdminAdminDetail } from '../pages/super-admin/AdminDetail';
import { SettingsPage as SuperAdminSettings } from '../pages/super-admin/Settings';
import { SecurityPage as SuperAdminSecurity } from '../pages/super-admin/Security';
import { ActivityPage as SuperAdminActivity } from '../pages/super-admin/Activity';
import { StudentsPage as SuperAdminStudents } from '../pages/super-admin/Students';

export const router = createBrowserRouter([
  // Public Login Route
  {
    path: '/login',
    element: <Login />,
  },
  
  // Student Portal Protected Layout Routing (Protected & Role Guarded)
  {
    path: '/student',
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRole="student">
          <AppLayout role="student" />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <Navigate to="notice-board" replace /> },
      { path: 'notice-board', element: <StudentNoticeBoard /> },
      { path: 'saved', element: <StudentSaved /> },
      { path: 'oia', element: <OiaGuard><StudentOia /></OiaGuard> },
      { path: 'materials', element: <StudentMaterials /> },
      { path: 'announcements', element: <StudentAnnouncements /> },
      { path: 'profile', element: <StudentProfile /> },
    ],
  },
  
  // Admin Portal Protected Layout Routing (Protected & Role Guarded)
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRole="admin">
          <AppLayout role="admin" />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'posts', element: <AdminPosts /> },
      { path: 'posts/create', element: <AdminCreatePost /> },
      { path: 'oia', element: <AdminOia /> },
      { path: 'materials', element: <AdminMaterials /> },
      { path: 'announcements', element: <AdminAnnouncements /> },
      { path: 'analytics', element: <AdminAnalytics /> },
      { path: 'students', element: <AdminStudents /> },
      { path: 'profile', element: <AdminProfile /> },
    ],
  },

  // Super Admin Portal Protected Layout Routing (Protected & SuperAdminGuard)
  {
    path: '/super-admin',
    element: (
      <ProtectedRoute>
        <SuperAdminGuard>
          <AppLayout role="super_admin" />
        </SuperAdminGuard>
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <SuperAdminDashboard /> },
      { path: 'admins', element: <SuperAdminAdmins /> },
      { path: 'admins/:id', element: <SuperAdminAdminDetail /> },
      { path: 'security', element: <SuperAdminSecurity /> },
      { path: 'activity', element: <SuperAdminActivity /> },
      { path: 'students', element: <SuperAdminStudents /> },
      { path: 'oia', element: <AdminOia /> },
      { path: 'settings', element: <SuperAdminSettings /> },
    ],
  },
  
  // Default Redirect Layout Root routing
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  
  // Fallback Catch-all Route redirecting to Login
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
