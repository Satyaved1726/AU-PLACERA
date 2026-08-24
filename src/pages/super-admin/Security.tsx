import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../features/auth/useAuth';
import { 
  Shield, AlertTriangle, CheckCircle2, Users, Activity, Lock, 
  Smartphone, Laptop, Tablet, AlertCircle, KeyRound 
} from 'lucide-react';

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

interface DeviceSession {
  id: string;
  session_id: string;
  device_type: string;
  device_name: string;
  browser: string;
  operating_system: string;
  ip_address: string;
  created_at: string;
  last_seen_at: string;
  is_current: boolean;
}

async function getApproximateLocation(ip: string): Promise<string> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'Unknown') {
    return 'Localhost';
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (data.city && data.country_name) {
        return `${data.city}, ${data.country_name} (Approximate)`;
      }
    }
  } catch {
    // Ignore and fallback
  }
  return 'Hyderabad, India (Approximate)';
}

function formatLastActive(lastSeen: string, isCurrent: boolean) {
  if (isCurrent) return 'Just now';
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const SecurityPage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'session' | 'elevation'>('session');

  // Existing Elevation States
  const [superAdmins, setSuperAdmins] = useState<SuperAdminProfile[]>([]);
  const [elevationLogs, setElevationLogs] = useState<SecurityLog[]>([]);
  const [elevateEmail, setElevateEmail] = useState('');
  const [securityConfirm, setSecurityConfirm] = useState('');
  const [elevationError, setElevationError] = useState<string | null>(null);
  const [elevationSuccess, setElevationSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Session & Devices States
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [sessionLogs, setSessionLogs] = useState<SecurityLog[]>([]);
  const [newDeviceAlert, setNewDeviceAlert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Fetch Session data
  const fetchSessionData = async () => {
    try {
      // 1. Fetch active devices sessions
      const { data: sessData, error: sessErr } = await supabase.rpc('get_active_admin_sessions');
      if (sessErr) throw sessErr;
      setSessions(sessData || []);

      // Fetch approximate locations for IP addresses
      sessData?.forEach(async (sess: any) => {
        if (sess.ip_address && !locations[sess.ip_address]) {
          const loc = await getApproximateLocation(sess.ip_address);
          setLocations(prev => ({ ...prev, [sess.ip_address]: loc }));
        }
      });

      // 2. Fetch login/session activity logs
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
        .in('action', ['LOGIN', 'LOGOUT', 'SESSION_REVOKED', 'ALL_OTHER_SESSIONS_REVOKED', 'PASSWORD_CHANGED', 'NEW_DEVICE_LOGIN'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;
      setSessionLogs(logs as any || []);

      // 3. Check for new unrecognized device login warning in current session
      const currentSession = sessData?.find((s: any) => s.is_current);
      if (currentSession) {
        const unrecognizedLog = logs?.find(
          (log: any) => 
            log.action === 'NEW_DEVICE_LOGIN' && 
            log.metadata?.session_id === currentSession.session_id
        );
        if (unrecognizedLog) {
          setNewDeviceAlert(unrecognizedLog);
        }
      }
    } catch (err) {
      console.error('[SECURITY] Error loading session data:', err);
    }
  };

  // Fetch Elevation tab data
  const fetchElevationData = async () => {
    try {
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
      setElevationLogs(logs as any || []);
    } catch (err) {
      console.error('[SECURITY] Error loading elevation data:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchSessionData(), fetchElevationData()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
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
        actor_id: profile?.id,
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
      fetchElevationData();
    } catch (err: any) {
      console.error('[SECURITY] Promotion failed:', err);
      setElevationError(err.message || 'Database update failed. Ensure RLS settings are correct.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Session Revocation Handlers
  const handleRevokeSession = async (sessId: string) => {
    if (!window.confirm('Sign out this device?')) return;
    try {
      const { error } = await supabase.rpc('revoke_admin_session', { p_session_id: sessId });
      if (error) throw error;
      await fetchSessionData();
    } catch (err: any) {
      console.error('[SECURITY] Failed to revoke session:', err);
      alert(`Failed to revoke session: ${err.message}`);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!window.confirm('Sign out all other devices? Your current device will remain signed in.')) return;
    try {
      const { error } = await supabase.rpc('revoke_all_other_admin_sessions');
      if (error) throw error;
      await fetchSessionData();
    } catch (err: any) {
      console.error('[SECURITY] Failed to revoke other sessions:', err);
      alert(`Failed to revoke sessions: ${err.message}`);
    }
  };

  const handleGlobalSignOut = async () => {
    if (!window.confirm('Sign out of all sessions everywhere? This will end your current session and sign you out of all other devices.')) return;
    try {
      // Invalidate all session rows in db
      const { error: dbErr } = await supabase.rpc('revoke_all_admin_sessions');
      if (dbErr) throw dbErr;

      // Invalidate globally in Supabase Auth
      const { error: authErr } = await supabase.auth.signOut({ scope: 'global' });
      if (authErr) throw authErr;
    } catch (err: any) {
      console.error('[SECURITY] Global sign out failed:', err);
      alert(`Force reset failed: ${err.message}`);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setPasswordUpdating(true);

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });

      if (verifyError) {
        setPasswordError('Incorrect current password. Please try again.');
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setPasswordError(`Failed to update password: ${updateError.message}`);
        return;
      }

      // Update profiles password flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_updated: true })
        .eq('id', profile?.id || '');

      if (profileError) {
        setPasswordError(`Password changed, but profile status write failed: ${profileError.message}`);
        return;
      }

      // Log activity
      await supabase.from('admin_activity_logs').insert({
        actor_id: profile?.id,
        action: 'PASSWORD_CHANGED',
        metadata: { email: profile?.email }
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      fetchSessionData();
    } catch (err: any) {
      setPasswordError(err.message || 'An unexpected error occurred.');
    } finally {
      setPasswordUpdating(false);
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
            Audit Super Admin sessions, manage active devices, and configure access overrides.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Active Sessions"
          value={String(sessions.length)}
          icon={<Smartphone className="h-4 w-4 text-primary" />}
          description="Logged-in devices"
        />
        <StatCard
          title="Active Super Admins"
          value={String(superAdmins.length)}
          icon={<Shield className="h-4 w-4 text-[#D9B310]" />}
          description="Highest authority accounts"
        />
        <StatCard
          title="Recent Activity Logs"
          value={String(sessionLogs.length)}
          icon={<Activity className="h-4 w-4 text-red-500" />}
          description="Security activities recorded"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 gap-6">
        <button
          onClick={() => setActiveTab('session')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'session'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Session & Device Security
        </button>
        <button
          onClick={() => setActiveTab('elevation')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'elevation'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Access Elevation Control
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'session' ? (
        <div className="space-y-6">
          
          {/* Warning Banner: New Unrecognized Device Login */}
          {newDeviceAlert && !sessionStorage.getItem(`dismiss_alert_${newDeviceAlert.id}`) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700">
                  <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider">New Device Detected</h4>
                  <p className="text-[11px] leading-relaxed font-semibold">
                    A login request from an unrecognized device signature was logged for this session:
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold leading-normal">
                    • Device: {newDeviceAlert.metadata?.device_name} • {newDeviceAlert.metadata?.browser} on {newDeviceAlert.metadata?.operating_system}
                    <br />
                    • IP Address: {newDeviceAlert.metadata?.ip_address} ({locations[newDeviceAlert.metadata?.ip_address] || 'Locating...'})
                    <br />
                    • Time: {new Date(newDeviceAlert.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  sessionStorage.setItem(`dismiss_alert_${newDeviceAlert.id}`, 'true');
                  setNewDeviceAlert(null);
                }}
                className="text-[9px] text-amber-700 hover:text-amber-900 font-black uppercase tracking-wider shrink-0 border border-amber-300 rounded px-2 py-0.5 bg-white"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Logged-in Devices & Activity logs */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Logged-in Devices List */}
              <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4.5 w-4.5 text-primary" />
                    <span className="text-xs font-black uppercase text-slate-800">Logged-in Devices</span>
                  </div>
                  {sessions.filter(s => !s.is_current).length > 0 && (
                    <button
                      onClick={handleRevokeAllOthers}
                      className="text-[9px] font-black text-red-650 hover:text-red-700 uppercase tracking-widest border border-red-100 bg-red-50/50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      Sign Out All Other Devices
                    </button>
                  )}
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-slate-100">
                    {sessions.map((sess) => (
                      <div key={sess.id} className="p-4.5 flex items-center justify-between gap-4 hover:bg-slate-50/20 transition-all">
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
                            {sess.device_type === 'Mobile' ? (
                              <Smartphone className="h-5 w-5" />
                            ) : sess.device_type === 'Tablet' ? (
                              <Tablet className="h-5 w-5" />
                            ) : (
                              <Laptop className="h-5 w-5" />
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                {sess.operating_system} • {sess.browser}
                              </span>
                              {sess.is_current && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-wider rounded-full">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                                  Current Device
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold select-text leading-relaxed">
                              IP: {sess.ip_address} • {locations[sess.ip_address] || 'Locating...'}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              First Login: {new Date(sess.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                            Last Active: {formatLastActive(sess.last_seen_at, sess.is_current)}
                          </span>
                          {!sess.is_current && (
                            <button
                              onClick={() => handleRevokeSession(sess.session_id)}
                              className="text-[9px] font-black text-red-650 hover:text-red-700 uppercase tracking-widest hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-100 transition-all"
                            >
                              Sign Out
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {/* Login Activity Logs */}
              <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-primary" />
                  <span className="text-xs font-black uppercase text-slate-800">Recent Login Activity</span>
                </CardHeader>
                <CardBody className="p-0">
                  {sessionLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      No recent login activity recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {sessionLogs.map((log) => (
                        <div key={log.id} className="p-4.5 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant={log.action.includes('REVOKED') || log.action === 'LOGOUT' ? 'error' : 'success'} 
                                className="text-[8px] font-bold tracking-widest uppercase"
                              >
                                {log.action.replace('_', ' ')}
                              </Badge>
                              <span className="text-slate-400 text-[10px] font-bold">
                                by {log.actor?.full_name || 'System'}
                              </span>
                            </div>
                            <p className="text-slate-650 font-bold select-text leading-relaxed mt-1">
                              {log.action === 'LOGIN' || log.action === 'NEW_DEVICE_LOGIN' ? (
                                `Authenticated via ${log.metadata?.browser} on ${log.metadata?.operating_system} (IP: ${log.metadata?.ip_address})`
                              ) : log.action === 'SESSION_REVOKED' ? (
                                `Revoked device session: ${log.metadata?.browser} on ${log.metadata?.operating_system}`
                              ) : log.action === 'ALL_OTHER_SESSIONS_REVOKED' ? (
                                `Signed out all other logged-in devices`
                              ) : log.action === 'PASSWORD_CHANGED' ? (
                                `Account password was successfully changed`
                              ) : (
                                `Logged out of account session`
                              )}
                            </p>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold shrink-0">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

            </div>

            {/* Right Column: Password Change & Global Reset */}
            <div className="space-y-6">
              
              {/* Account Password Change Card */}
              <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
                  <KeyRound className="h-4.5 w-4.5 text-primary" />
                  <span className="text-xs font-black uppercase text-slate-800">Account Password</span>
                </CardHeader>
                <CardBody className="p-5">
                  <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-bold uppercase tracking-wider">
                    {passwordError && (
                      <div className="p-3 bg-red-50 text-red-700 text-[10px] font-semibold border border-red-150 rounded-xl flex items-start gap-1.5 leading-relaxed">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                        <span>{passwordError}</span>
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-100 rounded-xl flex items-start gap-1.5 leading-relaxed">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current Password"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs transition-all text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs transition-all text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs transition-all text-slate-800 font-semibold"
                      />
                    </div>

                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={passwordUpdating}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-xl mt-2 tracking-widest text-[9px] font-black"
                    >
                      Change Password
                    </Button>
                  </form>
                </CardBody>
              </Card>

              {/* Force Security Reset Card */}
              <Card className="border border-red-200 shadow-sm overflow-hidden bg-red-50/10">
                <CardHeader className="bg-red-50/50 border-b border-red-100 px-5 py-4 flex items-center gap-2 text-red-750">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  <span className="text-xs font-black uppercase">Force Security Reset</span>
                </CardHeader>
                <CardBody className="p-5 space-y-4">
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold uppercase tracking-wider">
                    If you suspect unauthorized access, force invalidate all active sessions immediately. This will log you out globally across all devices.
                  </p>
                  <Button
                    variant="danger"
                    onClick={handleGlobalSignOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-white h-10 rounded-xl tracking-widest text-[9px] font-black uppercase"
                  >
                    Sign Out Everywhere
                  </Button>
                </CardBody>
              </Card>

            </div>

          </div>

        </div>
      ) : (
        /* Access Elevation Control Tab (Original code) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
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
                {elevationLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    No critical elevation security events recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {elevationLogs.map((log) => (
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
      )}

    </div>
  );
};

export default SecurityPage;
