import React, { useEffect, useState } from 'react';
import { useTeamMembers } from '../../features/team/hooks/useTeamMembers';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Users, GraduationCap, Building2, User, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { PostSkeleton } from '../../components/common/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';



export const TeamView: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading, error } = useTeamMembers();
  const [activeSsraIndex, setActiveSsraIndex] = useState(0);

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
                        <div className="h-36 w-36 sm:h-40 sm:w-40 rounded-full overflow-hidden shrink-0 border-2 border-slate-100 bg-slate-50 shadow-inner select-none relative">
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
              <div className="relative max-w-sm mx-auto select-none">
                <Card 
                  elevation={2} 
                  className="border border-slate-200 bg-white overflow-hidden rounded-3xl p-5 shadow-sm min-h-[280px] flex flex-col justify-between items-center relative"
                >
                  
                  {/* Slider Controls (Previous / Next Arrows) */}
                  <button
                    type="button"
                    onClick={() => setActiveSsraIndex((prev) => (prev > 0 ? prev - 1 : ssraMembers.length - 1))}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 active:scale-90 transition-all z-10 shadow-sm"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSsraIndex((prev) => (prev < ssraMembers.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 active:scale-90 transition-all z-10 shadow-sm"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <div className="w-full flex-grow flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={ssraMembers[activeSsraIndex].id}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="flex flex-col items-center text-center space-y-4 px-6 py-2 w-full"
                      >
                        {/* Avatar Circle Frame */}
                        <div className={`rounded-full overflow-hidden shrink-0 border-2 border-slate-100 bg-slate-50 shadow-inner select-none relative mx-auto transition-all duration-300 ${
                          ssraMembers[activeSsraIndex].full_name.includes('Satyaved')
                            ? 'h-36 w-36 sm:h-40 sm:w-40 border-slate-350 shadow-md ring-4 ring-[#0b3c5d]/5'
                            : 'h-24 w-24 sm:h-28 sm:w-28'
                        }`}>
                          {ssraMembers[activeSsraIndex].photo_path ? (
                            <img 
                              src={ssraMembers[activeSsraIndex].photo_path} 
                              alt={ssraMembers[activeSsraIndex].full_name} 
                              className="w-full h-full object-cover filter brightness-[0.98]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <User className="h-10 w-10" />
                            </div>
                          )}
                        </div>

                        {/* Content block */}
                        <div className="space-y-0.5 w-full">
                          <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase select-text">
                            {ssraMembers[activeSsraIndex].full_name}
                          </h3>
                          {ssraMembers[activeSsraIndex].designation && (
                            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider leading-none truncate">
                              {ssraMembers[activeSsraIndex].designation}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  
                  {/* Dot Indicators */}
                  <div className="flex justify-center gap-1.5 pt-2 pb-1 shrink-0">
                    {ssraMembers.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSsraIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === activeSsraIndex ? 'w-4 bg-[#0b3c5d]' : 'w-1.5 bg-slate-200'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                </Card>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default TeamView;
