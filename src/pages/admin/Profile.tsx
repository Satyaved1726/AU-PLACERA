import React, { useState } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { supabase } from '../../lib/supabase';
import { 
  User, Mail, Hash, Book, Eye, EyeOff, AlertCircle, 
  CheckCircle2, ShieldCheck, LogOut, Lock 
} from 'lucide-react';
import profileAvatarEmoji from '../../assets/profile_avatar_emoji.jpg';

export const Profile: React.FC = () => {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isAdmin) return 'Placement Coordinator';
    return 'Administrator';
  };

  const adminDetails = [
    { label: 'Official Email', value: profile?.email || 'N/A', icon: Mail, iconColor: 'text-blue-500 bg-blue-50' },
    { label: 'Staff / Coordinator ID', value: profile?.roll_number || 'N/A', icon: Hash, iconColor: 'text-indigo-500 bg-indigo-50' },
    { label: 'Affiliated Department', value: profile?.branch || 'AIML', icon: Book, iconColor: 'text-emerald-500 bg-emerald-50' }
  ];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    try {
      setUpdating(true);

      // Verify current password by signing in in the background
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });

      if (verifyError) {
        setErrorMsg('Incorrect current password. Please try again.');
        return;
      }

      // Securely update the user's password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setErrorMsg(`Failed to update password: ${updateError.message}`);
        return;
      }

      setSuccessMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-16 px-4 sm:px-0">
      
      {/* Header Banner Section */}
      <div className="flex items-center justify-between gap-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="space-y-1 z-10 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
            <span>{isSuperAdmin ? 'Super Admin' : 'Admin'} Profile</span>
            <CheckCircle2 className="h-5 w-5 text-blue-500 fill-blue-50/30" />
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
            View coordinator credentials and database role access permissions.
          </p>
        </div>
        
        <div className="relative shrink-0 select-none pointer-events-none">
          <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
          <img 
            src={profileAvatarEmoji} 
            alt="Profile Avatar Emoji" 
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain relative z-10 rounded-2xl bg-white shadow-sm border border-slate-100 p-0.5"
          />
        </div>
      </div>

      {/* Main Admin Header Card */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden flex flex-col items-center w-full">
        {/* Banner with absolute positioned avatar container */}
        <div className="w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-650 relative flex justify-center">
          {/* Avatar positioned absolutely */}
          <div className="absolute -bottom-10 h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-white bg-[#0B3C5D] flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-md select-none z-10">
            {getInitials(profile?.full_name)}
          </div>
        </div>
        
        {/* Profile metadata info with top padding to clear the avatar */}
        <div className="text-center px-6 pb-6 pt-12 space-y-2.5 w-full">
          <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-tight">
            {profile?.full_name || 'Loading Name...'}
          </h2>
          <span className="inline-flex px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full select-none">
            {getRoleLabel()}
          </span>
        </div>
      </div>

      {/* Section 1: Administrator Credentials */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <User className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Coordinator Credentials
          </h3>
        </div>

        <div className="bg-white border border-slate-150 shadow-sm rounded-3xl overflow-hidden divide-y divide-slate-100/80">
          {adminDetails.map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row py-2.5 px-4.5 sm:items-center justify-between gap-1 sm:gap-4 text-[11px] sm:text-xs">
              <div className="flex items-center gap-2.5 text-slate-500 font-semibold">
                <div className={`p-1.5 rounded-lg border border-slate-100/50 shrink-0 ${item.iconColor}`}>
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                </div>
                <span className="font-bold text-slate-500">{item.label}</span>
              </div>
              <span className="font-black text-slate-800 text-left sm:text-right break-all pl-0 sm:pl-4 max-w-none sm:max-w-[240px] md:max-w-xs">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Security Permissions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Security Permissions
          </h3>
        </div>

        <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700">Portal Role Access</span>
            </div>
            
            <div>
              <span className="inline-flex px-3.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-wider rounded-lg select-none">
                {isSuperAdmin ? 'Super Admin Access' : 'Coordinator Access'}
              </span>
            </div>
          </div>

          <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 select-text">
            {isSuperAdmin 
              ? 'Your account has full root administrative access to the portal system, including managing coordinator accounts, database configurations, and system configurations.' 
              : 'Your account has full write access to the placement database, including notice publishing, archiving, and student roster OIA verification management.'
            }
          </p>
        </div>
      </div>

      {/* Section 3: Change Password Form */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Lock className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Change Account Password
          </h3>
        </div>

        <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-5">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1 px-0.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-10 px-3.5 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1 px-0.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-10 pl-3.5 pr-10 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1 px-0.5">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full h-10 px-3.5 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="w-full py-3 bg-[#F4F9FF]/20 hover:bg-[#F4F9FF]/60 text-blue-600 hover:text-blue-700 border border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all select-none active:scale-[0.98] shadow-sm disabled:opacity-50 mt-2"
            >
              <span>{updating ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Section 4: Sign Out */}
      <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-4.5">
        <button
          onClick={() => signOut()}
          className="w-full py-3.5 bg-red-50 hover:bg-red-100/75 border border-red-100 text-red-650 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
      
    </div>
  );
};

export default Profile;
