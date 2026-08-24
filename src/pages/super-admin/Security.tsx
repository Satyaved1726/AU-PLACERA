import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { supabase } from '../../lib/supabase';
import { Shield, Key, AlertTriangle, CheckCircle2, Users, Activity, Lock } from 'lucide-react';

interface SuperAdminProfile {
  id: string;
  full_name: string;
  email: string;
  roll_number?: string;
  created_at: string;
}

interface SecurityLog {
  id: string;
  created_at: string;
  action: string;
  metadata: any;
  actor?: {
    full_name: string;
  };
}

export const SecurityPage: React.FC = () => {
  const [superAdmins, setSuperAdmins] = useState<SuperAdminProfile[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [elevateEmail, setElevateEmail] = useState('');
  const [securityConfirm, setSecurityConfirm] = useState('');
  const [elevationError, setElevationError] = useState<string | null>(null);
  const [elevationSuccess, setElevationSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch security data
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all super admin profiles
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, roll_number, created_at')
        .eq('role', 'super_admin');

      if (adminsError) throw adminsError;
      setSuperAdmins(admins || []);

      // Fetch critical security events
      const { data: logs, error: logsError } = await supabase
        .from('admin_activity_logs')
        .select(`
          id,
          created_at,
          action,
          metadata,
          actor:actor_id (
            full_name
          )
        `)
        .in('action', ['ADMIN_DEACTIVATED', 'ADMIN_DELETED', 'ADMIN_ROLE_CHANGED'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;
      setSecurityLogs(logs as any || []);
    } catch (err: any) {
      console.error('[SECURITY] Error loading info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Secure elevation workflow
  const handleElevate = async (e: React.FormEvent) => {
    e.preventDefault();
    setElevationError(null);
    setElevationSuccess(null);

    const emailTrimmed = elevateEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setElevationError('Please specify the candidate email address.');
      return;
    }

    if (securityConfirm !== 'CONFIRM-ELEVATION') {
      setElevationError('Please type CONFIRM-ELEVATION to verify authorization.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Verify the user exists in profiles
      const { data: targetProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('email', emailTrimmed)
        .maybeSingle();

      if (profileErr) throw profileErr;
      if (!targetProfile) {
        setElevationError('No registered user account found matching this email.');
        return;
      }

      if (targetProfile.role === 'super_admin') {
        setElevationError('This user is already a Super Admin.');
        return;
      }

      // Elevate target user's role to super_admin
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: 'super_admin', updated_at: new Date().toISOString() })
        .eq('id', targetProfile.id);

      if (updateErr) throw updateErr;

      // Update auth metadata
      await supabase.auth.admin?.updateUserById(targetProfile.id, {
        user_metadata: { role: 'super_admin' }
      });

      // Insert audit activity logs
      await supabase.from('admin_activity_logs').insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_admin_id: targetProfile.id,
        action: 'ADMIN_ROLE_CHANGED',
        metadata: {
          email: emailTrimmed,
          previous_role: targetProfile.role,
          new_role: 'super_admin',
          reason: 'High-security promotion workflow'
        }
      });

      setElevationSuccess(`Successfully promoted ${targetProfile.full_name} to Super Admin.`);
      setElevateEmail('');
      setSecurityConfirm('');
      fetchData();
    } catch (err: any) {
      console.error('[SECURITY] Promotion failed:', err);
      setElevationError(err.message || 'Database update failed. Ensure RLS settings are correct.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
        <Lock className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
            Security Control Panel
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Audit Super Admin access privileges and configure security overrides.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Active Super Admins"
          value={String(superAdmins.length)}
          icon={<Shield className="h-4 w-4 text-primary" />}
          description="Highest authority administrators"
        />
        <StatCard
          title="MFA Enforcement"
          value="Optional"
          icon={<Key className="h-4 w-4 text-amber-500" />}
          description="Authentication validation level"
        />
        <StatCard
          title="Security Alerts"
          value={String(securityLogs.length)}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          description="Critical actions recorded"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Roster & Log columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Super Admin Roster */}
          <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs font-black uppercase text-slate-800">Super Admin Accounts</span>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {superAdmins.map((admin) => (
                  <div key={admin.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800">{admin.full_name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold select-text mt-0.5">{admin.email}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      Created: {new Date(admin.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Critical Security Logs */}
          <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-red-500" />
              <span className="text-xs font-black uppercase text-slate-800">Security Events Log</span>
            </CardHeader>
            <CardBody className="p-0">
              {securityLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  No security events recorded.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {securityLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="error" className="text-[8px] font-bold tracking-widest uppercase">
                            {log.action.replace('ADMIN_', '')}
                          </Badge>
                          <span className="text-slate-400 text-[10px] font-bold">
                            by {log.actor?.full_name || 'System'}
                          </span>
                        </div>
                        <p className="text-slate-650 font-semibold mt-1.5 leading-relaxed">
                          {log.action === 'ADMIN_ROLE_CHANGED' 
                            ? `Elevated user to role ${log.metadata?.new_role || 'super_admin'}` 
                            : `Deactivated administrator account`}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

        </div>

        {/* Promotion Control */}
        <div>
          <Card className="border border-slate-200/85 shadow-sm overflow-hidden sticky top-6">
            <CardHeader className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center gap-2 text-white">
              <Shield className="h-4.5 w-4.5 text-[#D9B310]" />
              <span className="text-xs font-black uppercase tracking-wider">High Security Promotion</span>
            </CardHeader>
            <CardBody className="p-5 space-y-4 text-xs font-bold uppercase tracking-wider">
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                WARNING: Super Admins can override system policies, demote coordinators, and read security logs. Promote accounts with caution.
              </p>

              <form onSubmit={handleElevate} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">
                    Candidate Account Email
                  </label>
                  <input
                    type="email"
                    value={elevateEmail}
                    onChange={(e) => setElevateEmail(e.target.value)}
                    placeholder="name@anurag.edu.in"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">
                    Verification Challenge
                  </label>
                  <input
                    type="text"
                    value={securityConfirm}
                    onChange={(e) => setSecurityConfirm(e.target.value)}
                    placeholder="Type CONFIRM-ELEVATION"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs transition-all font-mono"
                  />
                </div>

                {elevationError && (
                  <div className="p-3 bg-red-50 text-red-700 text-[10px] font-semibold border border-red-150 rounded-xl flex items-start gap-1.5 leading-relaxed">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{elevationError}</span>
                  </div>
                )}

                {elevationSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-100 rounded-xl flex items-start gap-1.5 leading-relaxed">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{elevationSuccess}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-xl mt-2 tracking-widest text-[9px] font-black"
                >
                  Elevate Account
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

      </div>

    </div>
  );
};

export default SecurityPage;
