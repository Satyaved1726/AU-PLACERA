import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

interface OiaGuardProps {
  children: React.ReactElement;
}

export const OiaGuard: React.FC<OiaGuardProps> = ({ children }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Allow super admins, admins, and students with oia_eligible = true
  const isEligible = 
    profile && 
    (profile.role === 'super_admin' || 
     profile.role === 'admin' || 
     profile.oia_eligible === true);

  if (!isEligible) {
    if (import.meta.env.DEV) {
      console.warn(`🔒 Access denied to OIA section: User is not OIA eligible.`);
    }
    
    // Redirect to default portals based on actual role
    if (profile?.role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    } else if (profile?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/student/notice-board" replace />;
    }
  }

  return children;
};

export default OiaGuard;
