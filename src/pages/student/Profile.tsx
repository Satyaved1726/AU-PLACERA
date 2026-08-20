import React from 'react';
import { Card, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../features/auth/useAuth';
import { useMyRegistrations } from '../../features/registrations/hooks/useMyRegistrations';
import { User, ShieldCheck, Mail, Hash, Book, Calendar, ShieldAlert, GraduationCap, ClipboardCheck } from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile } = useAuth();
  const studentId = profile?.id;

  // Load registration history
  const { data: myRegistrations = [], isLoading: loadingRegs } = useMyRegistrations(studentId);

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

  // Academic details
  const academicDetails = [
    { label: 'Official Email', value: profile?.email || 'N/A', icon: Mail },
    { label: 'Roll Number', value: profile?.roll_number || 'N/A', icon: Hash },
    { label: 'Branch / Specialization', value: profile?.branch || 'AIML', icon: Book },
    { label: 'Class Section', value: profile?.section || 'N/A', icon: User },
    { label: 'Academic Year', value: getYearLabel(profile?.year), icon: GraduationCap },
    { label: 'Batch Period', value: profile?.batch || 'N/A', icon: Calendar }
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6 select-none pb-12 px-4 sm:px-0">
      
      {/* Header */}
      <div>
        <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Placement Profile</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
          Verify your verified academic records and OIA eligibility status.
        </p>
      </div>

      {/* Main Student Card Header */}
      <Card elevation={2} className="overflow-hidden border border-slate-200 shadow-md">
        <div className="h-20 bg-gradient-to-r from-primary to-primary-light relative" />
        <CardBody className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
            <div className="h-16 w-16 rounded-full border-4 border-white bg-secondary flex items-center justify-center font-bold text-base text-white shadow-md shrink-0 select-none">
              {getInitials(profile?.full_name)}
            </div>
            
            <div className="text-center sm:text-left pb-1">
              <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">
                {profile?.full_name || 'Loading Name...'}
              </h2>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-1.5 leading-none">
                AIML Student Profile
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Section 1: Academic Information */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          Academic Information
        </h3>
        <Card elevation={2} className="border border-slate-205 shadow-sm overflow-hidden">
          <CardBody className="p-0 divide-y divide-slate-100">
            {academicDetails.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row py-3.5 px-5 sm:items-center justify-between gap-1 sm:gap-4 text-xs">
                <div className="flex items-center gap-2.5 text-slate-500 font-semibold">
                  <item.icon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <span className="font-bold text-slate-800 text-left sm:text-right break-all pl-0 sm:pl-4 max-w-none sm:max-w-[240px] md:max-w-xs">{item.value}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Section 2: Placement Information */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          Placement Eligibility
        </h3>
        <Card elevation={2} className="border border-slate-205 shadow-sm">
          <CardBody className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs">
                <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                <span>OIA Eligibility</span>
              </div>
              
              <div>
                {profile?.oia_eligible ? (
                  <Badge variant="success" className="flex items-center gap-1 font-black">
                    <ShieldCheck className="h-3 w-3" />
                    <span>OIA Eligible</span>
                  </Badge>
                ) : (
                  <Badge variant="error" className="flex items-center gap-1 bg-red-50 border-red-150 text-red-600 font-black">
                    <ShieldAlert className="h-3 w-3" />
                    <span>OIA Ineligible</span>
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              {profile?.oia_eligible 
                ? 'Your profile is approved by the placement coordinator. You are authorized to apply to international internship drives.' 
                : 'Your profile has not yet been registered or approved by the Office of International Affairs. Please submit required credentials to your placement coordinator.'
              }
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Section 3: My Registrations */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          Registration Log History
        </h3>
        
        {loadingRegs ? (
          <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        ) : myRegistrations.length === 0 ? (
          <Card elevation={2} className="border border-slate-200 shadow-sm p-6 text-center">
            <span className="text-xs text-slate-400 font-semibold block">No registrations logged yet.</span>
          </Card>
        ) : (
          <Card elevation={2} className="border border-slate-205 shadow-sm overflow-hidden">
            <CardBody className="p-0 divide-y divide-slate-100">
              {myRegistrations.map(reg => (
                <div key={reg.id} className="flex py-3 px-5 items-center justify-between text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 mt-0.5 shrink-0 border border-emerald-100">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block leading-tight">{reg.company_name || 'Notice Announcement'}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block truncate max-w-[150px] sm:max-w-xs">{reg.opportunity_title || 'General Instructions'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[8px] text-emerald-600 font-black uppercase tracking-wider">
                      Registered
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold block mt-1 leading-none">
                      {new Date(reg.registered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
      
    </div>
  );
};
export default Profile;
