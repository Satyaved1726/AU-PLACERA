import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import type { UserRole } from '../types';

interface RoleGuardProps {
  children: React.ReactElement;
  allowedRole: UserRole;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRole }) => {
  const { profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Profile Configuration Error</h2>
          <p className="text-slate-600 text-sm">
            Your account was created successfully, but your AU Placera profile has not been configured yet.
          </p>
          <p className="text-slate-400 text-xs">
            Please contact the placement coordinator to authorize and configure your student/admin record.
          </p>
          <div className="pt-4">
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profile.status === 'suspended' || profile.status === 'inactive') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans text-center select-none">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-red-650 uppercase">Account Suspended</h2>
          <p className="text-slate-650 text-sm font-semibold">
            Your coordinator account has been suspended or deactivated by the Super Admin.
          </p>
          <p className="text-slate-400 text-xs">
            You no longer have access to coordinator features. Please contact the placement administrator.
          </p>
          <div className="pt-4">
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAccess = 
    profile.role === allowedRole || 
    (allowedRole === 'admin' && profile.role === 'super_admin');

  if (!hasAccess) {
    console.warn(`🔒 Access denied: User role "${profile.role}" does not match required role "${allowedRole}"`);
    
    // Redirect to default portals based on actual role
    if (profile.role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    } else if (profile.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/student/notice-board" replace />;
    }
  }

  return children;
};
export default RoleGuard;
