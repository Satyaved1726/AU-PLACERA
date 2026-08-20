import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

interface SuperAdminGuardProps {
  children: React.ReactElement;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ children }) => {
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
            Please contact the placement coordinator to authorize and configure your record.
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

  if (profile.role !== 'super_admin') {
    console.warn(`🔒 Access denied: User role "${profile.role}" does not match super admin privileges.`);
    
    // Redirect to default portals based on actual role
    if (profile.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/student/notice-board" replace />;
    }
  }

  return children;
};

export default SuperAdminGuard;
