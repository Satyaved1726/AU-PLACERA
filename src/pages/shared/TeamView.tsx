import React, { useEffect } from 'react';
import { useTeamMembers } from '../../features/team/hooks/useTeamMembers';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Users, GraduationCap, Building2, User } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';

const LinkedinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const TeamView: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading, error } = useTeamMembers();

  // Subscribe to real-time updates for auto-refetching
  useEffect(() => {
    const channel = supabase
      .channel('public:team_members_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-members'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Filter active members (view-only user view displays only active profiles)
  const activeMembers = members.filter(m => m.is_active);

  // Group by category
  const leadershipMembers = activeMembers.filter(m => m.category === 'leadership');
  const ssraMembers = activeMembers.filter(m => m.category === 'ssra');

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 select-none px-4 sm:px-0">
      
      {/* Page Title */}
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto text-primary shadow-sm select-none">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
          Placement Team & Developers
        </h1>
        <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed max-w-md mx-auto">
          Meet the advisors, coordinators, and developers behind the AU Placera placement ecosystem.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <PostSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl text-center">
          Failed to load placement team directory. Please check your internet connection.
        </div>
      ) : (
        <>
          {/* SECTION 1: LEADERSHIP TEAM */}
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Placement Team Leadership
              </h2>
            </div>

            {leadershipMembers.length === 0 ? (
              <div className="text-center py-8 bg-white border border-slate-150 rounded-2xl text-xs text-slate-400 font-semibold uppercase">
                No active leadership profiles configured yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {leadershipMembers.map(member => (
                  <Card 
                    key={member.id}
                    elevation={2} 
                    className="border border-slate-200/80 bg-white overflow-hidden rounded-2xl flex flex-col hover:border-slate-300 transition-all shadow-sm"
                  >
                    {/* Portrait Photograph (Aspect Ratio 3:4) */}
                    <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden w-full select-none">
                      {member.photo_path ? (
                        <img 
                          src={member.photo_path} 
                          alt={member.full_name} 
                          className="w-full h-full object-cover filter brightness-[0.98] transition-transform duration-300 hover:scale-[1.02]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                          <User className="h-12 w-12" />
                        </div>
                      )}
                    </div>

                    {/* Member Details */}
                    <CardBody className="p-4.5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-850 tracking-tight leading-snug wrap-words">
                          {member.full_name}
                        </h3>
                        <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider leading-none">
                          {member.designation}
                        </p>
                        {member.department && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none pt-0.5">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span>{member.department}</span>
                          </div>
                        )}
                      </div>

                      {member.description && (
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-xl whitespace-pre-wrap select-text">
                          {member.description}
                        </p>
                      )}

                      {/* Social handles */}
                      {(member.linkedin_url || member.github_url) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100/60">
                          {member.linkedin_url && (
                            <a 
                              href={member.linkedin_url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-[#0077B5] rounded-lg transition-colors"
                              title="LinkedIn profile"
                            >
                              <LinkedinIcon className="h-4 w-4 shrink-0" />
                            </a>
                          )}
                          {member.github_url && (
                            <a 
                              href={member.github_url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-black rounded-lg transition-colors"
                              title="GitHub profile"
                            >
                              <GithubIcon className="h-4 w-4 shrink-0" />
                            </a>
                          )}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: DEVELOPED BY - TEAM SSRA */}
          <div className="space-y-6 pt-4">
            <div className="border-b border-slate-200 pb-3 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-[#0B3C5D] shrink-0" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Developed By — TEAM SSRA
                </h2>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider leading-relaxed mt-0.5">
                Student Selection & Recruitment Assistance
              </p>
            </div>

            {/* Description Info block */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-3xl p-5 text-center sm:text-left shadow-inner">
              <p className="text-[11px] sm:text-xs text-slate-655 font-bold leading-relaxed max-w-3xl">
                TEAM SSRA developed AU Placera to assist students with placement opportunities, recruitment communication, registrations, and related placement activities at Anurag University.
              </p>
            </div>

            {ssraMembers.length === 0 ? (
              <div className="text-center py-8 bg-white border border-slate-150 rounded-2xl text-xs text-slate-400 font-semibold uppercase">
                No active SSRA developer profiles configured yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {ssraMembers.map(member => (
                  <Card 
                    key={member.id}
                    elevation={2} 
                    className="border border-slate-200/60 bg-white overflow-hidden rounded-2xl flex flex-col hover:border-slate-300 transition-all shadow-sm"
                  >
                    {/* Compact Image View (Aspect Ratio 1:1 square or 3:4) */}
                    <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden w-full select-none">
                      {member.photo_path ? (
                        <img 
                          src={member.photo_path} 
                          alt={member.full_name} 
                          className="w-full h-full object-cover filter brightness-[0.98]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                          <User className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Member Details */}
                    <CardBody className="p-3.5 flex-grow flex flex-col justify-between space-y-2">
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-black text-slate-800 tracking-tight leading-tight truncate">
                          {member.full_name}
                        </h3>
                        <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider leading-none truncate">
                          {member.designation}
                        </p>
                        {member.department && (
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide leading-none truncate pt-0.5">
                            {member.department}
                          </p>
                        )}
                      </div>

                      {member.description && (
                        <p className="text-[9px] text-slate-500 font-semibold leading-relaxed bg-slate-50 border border-slate-100 p-2 rounded-lg line-clamp-2 select-text">
                          {member.description}
                        </p>
                      )}

                      {/* Social handles */}
                      {(member.linkedin_url || member.github_url) && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100/60 justify-end">
                          {member.linkedin_url && (
                            <a 
                              href={member.linkedin_url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-blue-50 text-slate-455 hover:text-[#0077B5] rounded-md transition-colors"
                              title="LinkedIn profile"
                            >
                              <LinkedinIcon className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          )}
                          {member.github_url && (
                            <a 
                              href={member.github_url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-slate-100 text-slate-455 hover:text-black rounded-md transition-colors"
                              title="GitHub profile"
                            >
                              <GithubIcon className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          )}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default TeamView;
