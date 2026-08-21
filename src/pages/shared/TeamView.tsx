import React, { useEffect } from 'react';
import { useTeamMembers } from '../../features/team/hooks/useTeamMembers';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Users, GraduationCap, Building2, User, Mail, Phone } from 'lucide-react';
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

  // Filter active members
  const activeMembers = members.filter(m => m.is_active);

  // Mapped display order for leadership designations
  const leadershipOrder = { hod: 1, oia: 2, placement_coordinator: 3 };

  // Sort leadership members by pre-defined order, then display_order
  const getLeadershipSorted = () => {
    const leadership = activeMembers.filter(m => m.category !== 'ssra');
    return [...leadership].sort((a, b) => {
      const orderA = leadershipOrder[a.category as keyof typeof leadershipOrder] || 99;
      const orderB = leadershipOrder[b.category as keyof typeof leadershipOrder] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.display_order - b.display_order;
    });
  };

  const leadershipMembers = getLeadershipSorted();
  const ssraMembers = [...activeMembers.filter(m => m.category === 'ssra')].sort((a, b) => a.display_order - b.display_order);

  // Mapped designator headers for cards
  const categoryLabels: Record<string, string> = {
    hod: 'HOD',
    oia: 'OIA',
    placement_coordinator: 'Placement Coordinator'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24 select-none px-4 sm:px-0">
      
      {/* Page Title / Header Block */}
      <div className="text-center space-y-4 pt-4">
        <div className="h-14 w-14 rounded-full bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 flex items-center justify-center mx-auto text-[#0B3C5D] shadow-sm select-none">
          <Users className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#0B3C5D] tracking-tight uppercase">
            PLACEMENT TEAM
          </h1>
          <div className="w-10 h-0.5 bg-[#0B3C5D] mx-auto rounded-full" />
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-wider leading-relaxed max-w-lg mx-auto">
          Meet the core team driving the AU Placera placement ecosystem.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <PostSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl text-center">
          Failed to load placement team directory. Please check your connection.
        </div>
      ) : (
        <>
          {/* SECTION 1: LEADERSHIP TEAM */}
          <div className="space-y-6">
            {/* Section Header */}
            <div className="border-b border-slate-200 pb-3 flex flex-col gap-1 text-center sm:text-left select-none">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Users className="h-5 w-5 text-[#0B3C5D] shrink-0" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  PLACEMENT TEAM
                </h2>
              </div>
            </div>

            {leadershipMembers.length === 0 ? (
              <div className="text-center py-10 bg-white border border-slate-150 rounded-2xl text-xs text-slate-400 font-semibold uppercase">
                No active leadership profiles configured yet.
              </div>
            ) : (
              <div className="space-y-6">
                {leadershipMembers.map(member => (
                  <Card 
                    key={member.id}
                    elevation={2} 
                    className="border-l-4 border-l-[#0b3c5d] border-y border-r border-slate-200 bg-white overflow-hidden rounded-r-3xl rounded-l-md hover:border-slate-350 hover:shadow-md transition-all shadow-sm"
                  >
                    <CardBody className="p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7">
                      
                      {/* Section tag / Label Badge */}
                      <div className="w-full sm:w-auto shrink-0 flex sm:flex-col items-center gap-2 pb-3 sm:pb-0 border-b sm:border-b-0 sm:border-r border-slate-100 sm:pr-6 min-w-[120px]">
                        <div className="p-1.5 bg-[#0B3C5D]/5 rounded-lg text-[#0B3C5D] shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-black text-[#0B3C5D] uppercase tracking-wider">
                          {categoryLabels[member.category] || 'Advisor'}
                        </span>
                      </div>

                      {/* Photo + Detail Content block */}
                      <div className="flex-1 w-full flex flex-col sm:flex-row items-center sm:items-start gap-4.5 sm:gap-6 min-w-0">
                        {/* Circular Photograph (object-cover) */}
                        <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden shrink-0 border-2 border-slate-100 bg-slate-50 shadow-inner select-none relative">
                          {member.photo_path ? (
                            <img 
                              src={member.photo_path} 
                              alt={member.full_name} 
                              className="w-full h-full object-cover filter brightness-[0.98]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <User className="h-10 w-10" />
                            </div>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="flex-1 min-w-0 text-center sm:text-left space-y-2 select-text">
                          <div className="space-y-0.5">
                            <h3 className="text-base font-black text-slate-850 tracking-tight leading-tight uppercase">
                              {member.full_name}
                            </h3>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
                              {member.designation}
                            </p>
                            {member.department && (
                              <div className="flex items-center justify-center sm:justify-start gap-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wide leading-none pt-0.5">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span>{member.department}</span>
                              </div>
                            )}
                          </div>

                          {/* Contact Info (Mock style) */}
                          <div className="space-y-1.5 pt-1">
                            {member.email && (
                              <a 
                                href={`mailto:${member.email}`}
                                className="flex items-center justify-center sm:justify-start gap-2 text-[10px] sm:text-xs text-slate-550 hover:text-[#0B3C5D] font-bold leading-none select-text"
                              >
                                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{member.email}</span>
                              </a>
                            )}
                            {member.phone && (
                              <a 
                                href={`tel:${member.phone}`}
                                className="flex items-center justify-center sm:justify-start gap-2 text-[10px] sm:text-xs text-slate-550 hover:text-[#0B3C5D] font-bold leading-none select-text"
                              >
                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{member.phone}</span>
                              </a>
                            )}
                          </div>

                          {member.description && (
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-relaxed bg-[#F8FAFC] border border-slate-100 p-2.5 rounded-xl whitespace-pre-wrap select-text mt-2 text-left">
                              {member.description}
                            </p>
                          )}
                        </div>
                      </div>

                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: DEVELOPED BY - TEAM SSRA */}
          <div className="space-y-6 pt-6">
            
            {/* Header Block */}
            <div className="border-b border-slate-200 pb-3 flex flex-col gap-1 text-center sm:text-left select-none">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block leading-none">
                Developed By
              </span>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <GraduationCap className="h-5 w-5 text-[#0B3C5D] shrink-0" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  TEAM SSRA
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
              <div className="text-center py-10 bg-white border border-slate-150 rounded-2xl text-xs text-slate-400 font-semibold uppercase">
                No active SSRA developer profiles configured yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {ssraMembers.map(member => (
                  <Card 
                    key={member.id}
                    elevation={2} 
                    className="border border-slate-200 bg-white overflow-hidden rounded-2xl flex flex-col hover:border-slate-350 hover:shadow-md transition-all shadow-sm text-center"
                  >
                    <CardBody className="p-4 flex-grow flex flex-col items-center justify-between space-y-3">
                      
                      {/* Avatar Circle Frame */}
                      <div className="h-20 w-20 rounded-full overflow-hidden shrink-0 border-2 border-slate-100 bg-slate-50 shadow-inner select-none relative mx-auto">
                        {member.photo_path ? (
                          <img 
                            src={member.photo_path} 
                            alt={member.full_name} 
                            className="w-full h-full object-cover filter brightness-[0.98]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <User className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Content block */}
                      <div className="space-y-1 w-full">
                        <h3 className="text-xs font-black text-slate-800 tracking-tight leading-tight uppercase line-clamp-1 truncate select-text">
                          {member.full_name}
                        </h3>
                        <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider leading-none truncate">
                          {member.designation}
                        </p>
                        
                        {member.email && (
                          <p className="text-[8.5px] font-bold text-slate-450 uppercase tracking-wide truncate mt-0.5 leading-none select-text" title={member.email}>
                            {member.email}
                          </p>
                        )}
                        {member.phone && (
                          <p className="text-[8.5px] font-bold text-slate-450 uppercase tracking-wide truncate mt-0.5 leading-none select-text">
                            {member.phone}
                          </p>
                        )}
                      </div>

                      {member.description && (
                        <p className="text-[9px] text-slate-500 font-semibold leading-relaxed bg-[#F8FAFC] border border-slate-100 p-2 rounded-lg line-clamp-2 select-text w-full text-left">
                          {member.description}
                        </p>
                      )}

                      {/* Social handles */}
                      {(member.linkedin_url || member.github_url) && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100/60 justify-center w-full">
                          {member.linkedin_url && (
                            <a 
                              href={member.linkedin_url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-blue-50 text-slate-450 hover:text-[#0077B5] rounded-md transition-colors"
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
