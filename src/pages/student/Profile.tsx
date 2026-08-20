import React from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { 
  User, Mail, Hash, Book, Calendar, GraduationCap, 
  ShieldCheck, LogOut, CheckCircle2 
} from 'lucide-react';
import profileAvatarEmoji from '../../assets/profile_avatar_emoji.jpg';

export const Profile: React.FC = () => {
  const { profile, signOut } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getYearLabel = (year?: number) => {
    if (!year) return 'N/A';
    if (year === 1) return '1st Year';
    if (year === 2) return '2nd Year';
    if (year === 3) return '3rd Year';
    return `${year}th Year`;
  };

  // Academic details list with slightly tighter padding
  const academicDetails = [
    { label: 'Official Email', value: profile?.email || 'N/A', icon: Mail, iconColor: 'text-blue-500 bg-blue-50' },
    { label: 'Roll Number', value: profile?.roll_number || 'N/A', icon: Hash, iconColor: 'text-indigo-500 bg-indigo-50' },
    { label: 'Branch / Specialization', value: profile?.branch || 'AIML', icon: Book, iconColor: 'text-emerald-500 bg-emerald-50' },
    { label: 'Class Section', value: profile?.section || 'N/A', icon: User, iconColor: 'text-amber-500 bg-amber-50' },
    { label: 'Academic Year', value: getYearLabel(profile?.year), icon: GraduationCap, iconColor: 'text-purple-500 bg-purple-50' },
    { label: 'Batch Period', value: profile?.batch || 'N/A', icon: Calendar, iconColor: 'text-rose-500 bg-rose-50' }
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-16 px-4 sm:px-0">
      
      {/* Header Banner Section */}
      <div className="flex items-center justify-between gap-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="space-y-1 z-10 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
            <span>Placement Profile</span>
            <CheckCircle2 className="h-5 w-5 text-blue-500 fill-blue-50/30" />
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
            Verify your academic records and OIA eligibility status.
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

      {/* Main Student Header Card */}
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
            AIML Student
          </span>
        </div>
      </div>

      {/* Section 1: Academic Information */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Academic Information
          </h3>
        </div>

        <div className="bg-white border border-slate-150 shadow-sm rounded-3xl overflow-hidden divide-y divide-slate-100/80">
          {academicDetails.map((item, idx) => (
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

      {/* Section 2: Placement Information */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Placement Eligibility
          </h3>
        </div>

        <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700">OIA Eligibility</span>
            </div>
            
            <div>
              {profile?.oia_eligible ? (
                <span className="inline-flex px-3.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-wider rounded-lg select-none">
                  OIA Eligible
                </span>
              ) : (
                <span className="inline-flex px-3.5 py-1 bg-red-50 border border-red-100 text-red-600 text-[8px] font-black uppercase tracking-wider rounded-lg select-none">
                  OIA Ineligible
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 select-text">
            {profile?.oia_eligible 
              ? 'You are eligible for OIA. Your profile is approved by the placement coordinator. You are authorized to apply to international internship drives.' 
              : 'Your profile has not yet been registered or approved by the Office of International Affairs. Please submit required credentials to your placement coordinator.'
            }
          </p>
        </div>
      </div>

      {/* Section 3: Sign Out */}
      <div className="pt-2">
        <button
          onClick={() => signOut()}
          className="w-full py-3.5 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
      
    </div>
  );
};
export default Profile;
