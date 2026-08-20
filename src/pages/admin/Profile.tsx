import React, { useState } from 'react';
import { Card, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../features/auth/useAuth';
import { supabase } from '../../lib/supabase';
import { User, ShieldCheck, Mail, Hash, Book, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile } = useAuth();
  
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

  const adminDetails = [
    { label: 'Administrator Email', value: profile?.email || 'N/A', icon: Mail },
    { label: 'Staff / Coordinator ID', value: profile?.roll_number || 'N/A', icon: Hash },
    { label: 'Affiliated Department', value: profile?.branch || 'AIML', icon: Book }
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
    <div className="max-w-xl mx-auto space-y-6 select-none pb-12 px-4 sm:px-0">
      
      {/* Header */}
      <div>
        <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Administrator Profile</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
          View your registered academic administrator credentials and database role access permissions.
        </p>
      </div>

      {/* Main Admin Card Header */}
      <Card elevation={2} className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="h-20 bg-gradient-to-r from-[#0B3C5D] to-secondary relative" />
        <CardBody className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
            <div className="h-16 w-16 rounded-full border-4 border-white bg-slate-800 flex items-center justify-center font-bold text-base text-white shadow-md shrink-0 select-none">
              {getInitials(profile?.full_name)}
            </div>
            
            <div className="text-center sm:text-left pb-1">
              <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">
                {profile?.full_name || 'Loading Name...'}
              </h2>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-1.5 leading-none">
                AIML Placement Coordinator
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Section 1: Coordinator Credentials */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          Coordinator Credentials
        </h3>
        <Card elevation={2} className="border border-slate-205 shadow-sm overflow-hidden">
          <CardBody className="p-0 divide-y divide-slate-100">
            {adminDetails.map((item, idx) => (
              <div key={idx} className="flex py-3 px-5 items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-500 font-semibold">
                  <item.icon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <span className="font-bold text-slate-800 text-right truncate pl-4 max-w-[200px] sm:max-w-xs">{item.value}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Section 2: Security Permissions */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          Security Permissions
        </h3>
        <Card elevation={2} className="border border-slate-205 shadow-sm">
          <CardBody className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs">
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Portal Role Access</span>
              </div>
              
              <Badge variant="primary" className="flex items-center gap-1 font-black bg-slate-900 border-transparent text-white">
                <ShieldCheck className="h-3 w-3" />
                <span>Administrator</span>
              </Badge>
            </div>

            <p className="text-[10px] text-slate-405 font-semibold leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              Your account has full write access to the placement database, including notice publishing, archiving, and student roster OIA verification management.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Section 3: Change Account Password */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          Change Account Password
        </h3>
        <Card elevation={2} className="border border-slate-205 shadow-sm">
          <CardBody className="p-5">
            <form onSubmit={handleChangePassword} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full h-10 pl-3 pr-10 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
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
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                isLoading={updating}
                className="w-full h-10 rounded-xl mt-2 font-black uppercase text-[10px] tracking-wider"
              >
                Update Password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
      
    </div>
  );
};
export default Profile;
