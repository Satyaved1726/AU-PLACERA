import React, { useState } from 'react';
import { useStudents } from '../../features/auth/hooks/useStudents';
import { useUpdateStudentOia } from '../../features/auth/hooks/useUpdateStudentOia';
import { SearchBar } from '../../components/common/SearchBar';
import { AlertCircle, ShieldCheck, ShieldAlert, GraduationCap, Mail, Hash, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Students: React.FC = () => {
  const { data: students, isLoading, error } = useStudents();
  const updateOiaMutation = useUpdateStudentOia();

  // Search keyword state
  const [searchQuery, setSearchQuery] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle OIA eligibility
  const handleToggleOia = async (studentId: string, currentVal: boolean) => {
    try {
      await updateOiaMutation.mutateAsync({
        studentId,
        oiaEligible: !currentVal
      });
      triggerToast(!currentVal ? 'OIA Placement eligibility granted.' : 'OIA Placement eligibility revoked.');
    } catch {
      triggerToast('Failed to update student OIA eligibility.');
    }
  };

  // Filter students based on search keyword
  const filteredStudents = (students || []).filter(student => {
    const text = (
      (student.full_name || '') + ' ' + 
      (student.roll_number || '') + ' ' + 
      (student.email || '')
    ).toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Global Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-white/5"
          >
            <CheckCircle2 className="h-4 w-4 text-[#D9B310] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Student Roster</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            View the AIML student database, filter by credentials, and update OIA placement eligibility.
          </p>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchBar onSearchChange={setSearchQuery} className="w-full sm:max-w-xs" />
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
            {filteredStudents.length} Students Registered
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-155 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>Failed to load student profiles. Please check your Supabase credentials or network connection.</span>
        </div>
      )}

      {/* LOADING STATE SKELETON */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(idx => (
            <div key={idx} className="h-20 rounded-2xl bg-slate-200/60 animate-pulse border border-slate-200" />
          ))}
        </div>
      )}

      {/* EMPTY LIST STATE */}
      {!isLoading && filteredStudents.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <GraduationCap className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No students found</h3>
          <p className="text-[10px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            No matching students were found in the database.
          </p>
        </div>
      )}

      {/* LIST LAYOUT */}
      {!isLoading && filteredStudents.length > 0 && (
        <>
          {/* 1. MOBILE CARDS VIEW (md:hidden) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredStudents.map(student => (
              <div 
                key={student.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-350 transition-all duration-200 select-none"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">
                      {student.full_name}
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-1 leading-none">
                      {student.branch} • Year {student.year || 'N/A'} • {student.section || 'N/A'}
                    </span>
                  </div>
                  
                  {/* Avatar Initials */}
                  <div className="h-8.5 w-8.5 rounded-full bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                    {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate select-text">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="select-text">Roll: {student.roll_number || 'N/A'}</span>
                  </div>
                  {student.batch && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Batch: {student.batch}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    OIA Eligibility
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleToggleOia(student.id, student.oia_eligible)}
                    className={`h-9 px-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
                      student.oia_eligible 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {student.oia_eligible ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Granted</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Revoked</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 2. DESKTOP TABLE VIEW (md:block hidden) */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Roll Number</th>
                  <th className="px-6 py-4">Branch / Year</th>
                  <th className="px-6 py-4">Section / Batch</th>
                  <th className="px-6 py-4 text-center">OIA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/30 text-xs sm:text-sm transition-colors select-none">
                    {/* Student name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8.5 w-8.5 rounded-full bg-slate-50 border border-slate-100 text-slate-650 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                          {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 block leading-tight">{student.full_name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block select-text">{student.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Roll */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-600 select-text">
                      {student.roll_number || 'N/A'}
                    </td>

                    {/* Branch / Year */}
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      <span>{student.branch}</span>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span className="text-[10px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider text-slate-500">
                        Yr {student.year || 'N/A'}
                      </span>
                    </td>

                    {/* Section / Batch */}
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      <span>{student.section || 'N/A'}</span>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span className="text-slate-500 text-[11px] font-medium">{student.batch || 'N/A'}</span>
                    </td>

                    {/* OIA Status */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleToggleOia(student.id, student.oia_eligible)}
                          className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all ${
                            student.oia_eligible 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100/55' 
                              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-650 hover:bg-slate-50'
                          }`}
                        >
                          {student.oia_eligible ? (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Eligible</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                              <span>Ineligible</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
};
export default Students;
