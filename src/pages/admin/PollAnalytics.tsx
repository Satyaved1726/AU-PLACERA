import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePollAnalytics } from '../../features/polls/hooks/usePollAnalytics';
import { exportPollToExcel, exportPollToPdf } from '../../features/polls/utils/pollExportUtils';
import { SearchBar } from '../../components/common/SearchBar';
import { 
  BarChart3, 
  ArrowLeft, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FileSpreadsheet, 
  FileText, 
  Percent, 
  UserX, 
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';

export const PollAnalytics: React.FC = () => {
  const { id: pollId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: analytics, isLoading, error } = usePollAnalytics(pollId || '');

  // Active view tab: 'responses' or 'non_responders'
  const [activeTab, setActiveTab] = useState<'responses' | 'non_responders'>('responses');

  // Filters for student tables
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [optionFilter, setOptionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 space-y-4">
        <div className="h-28 bg-white border border-slate-200 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold inline-flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>Failed to load poll analytics. Please verify the poll ID.</span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/polls')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase"
          >
            Back to Polls
          </button>
        </div>
      </div>
    );
  }

  const { poll, total_students, students_voted, not_responded, response_rate, option_breakdown, section_breakdown, student_responses, non_responders } = analytics;

  // Filter Student Responses
  const filteredStudentResponses = student_responses.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = r.student_name.toLowerCase().includes(q) || r.roll_number.toLowerCase().includes(q);
    const matchesSection = sectionFilter === 'all' || r.section === sectionFilter;
    const matchesOption = optionFilter === 'all' || r.selected_options.includes(optionFilter);
    return matchesSearch && matchesSection && matchesOption;
  });

  // Filter Non-Responders
  const filteredNonResponders = non_responders.filter(nr => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = nr.student_name.toLowerCase().includes(q) || nr.roll_number.toLowerCase().includes(q);
    const matchesSection = sectionFilter === 'all' || nr.section === sectionFilter;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4 sm:px-0 select-none">
      
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/polls')}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all shadow-sm"
            title="Back to Polls"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {poll.allow_multiple_answers ? 'Multiple Answers Poll' : 'Single Answer Poll'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                AIML Department • Batch 2023–2027
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {poll.question}
            </h1>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Posted on {new Date(poll.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Excel Export */}
            <button
              type="button"
              onClick={() => exportPollToExcel(analytics)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* PDF Export */}
            <button
              type="button"
              onClick={() => exportPollToPdf(analytics)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* OVERALL RESULTS KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-widest">
              Total Students
            </span>
            <Users className="w-4 h-4 text-[#0B3C5D]" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {total_students}
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">
            AIML Student Base
          </span>
        </div>

        {/* Total Students Voted */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-widest">
              Students Voted
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {students_voted}
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">
            Unique Voters
          </span>
        </div>

        {/* Not Responded */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-widest">
              Not Responded
            </span>
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600">
            {not_responded}
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">
            Pending Votes
          </span>
        </div>

        {/* Response Rate */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-widest">
              Response Rate
            </span>
            <Percent className="w-4 h-4 text-[#D9B310]" />
          </div>
          <div className="text-2xl font-black text-[#D9B310]">
            {response_rate}%
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">
            Participation Rate
          </span>
        </div>
      </div>

      {/* OPTION-WISE RESULTS CARD */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0B3C5D]" />
            <span>Option Results</span>
          </h3>

          {poll.allow_multiple_answers && (
            <div className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>Multiple answers poll: percentages reflect proportion of total participating voters.</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {option_breakdown.map((opt, idx) => (
            <div key={opt.option_id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-800 flex items-center gap-2">
                  <span className="w-4 text-center text-slate-400 font-black">{idx + 1}.</span>
                  <span className="font-bold text-sm text-slate-900">{opt.option_text}</span>
                </span>
                <span className="text-slate-600">
                  <span className="font-black text-[#0B3C5D] mr-2">{opt.votes} student{opt.votes !== 1 ? 's' : ''}</span>
                  <span className="text-slate-400 font-medium">({opt.percentage}%)</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(opt.percentage, 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    idx === 0
                      ? 'bg-[#0B3C5D]'
                      : idx === 1
                      ? 'bg-[#328CC1]'
                      : idx === 2
                      ? 'bg-[#D9B310]'
                      : 'bg-emerald-600'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DYNAMIC SECTION-WISE RESULTS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Section-Wise Results
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Automated section breakdown across AIML Sections A, B, C, D, E, and F.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">Section</th>
                {poll.options.map(opt => (
                  <th key={opt.id} className="py-2.5 px-3 text-center">
                    {opt.option_text}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center">Students Voted</th>
                <th className="py-2.5 px-3 text-center">Eligible</th>
                <th className="py-2.5 px-3 text-right">Response Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {section_breakdown.map(sec => (
                <tr key={sec.section} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 text-slate-900 font-black">
                    {sec.display_section}
                  </td>
                  {poll.options.map(opt => (
                    <td key={opt.id} className="py-3 px-3 text-center text-slate-700">
                      {sec.option_counts[opt.id] || 0}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center text-[#0B3C5D] font-black">
                    {sec.students_voted}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500">
                    {sec.eligible_students}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                      sec.response_rate >= 75
                        ? 'bg-emerald-50 text-emerald-700'
                        : sec.response_rate >= 50
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {sec.response_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT-WISE DATA & NOT RESPONDED TABS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Tab Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200/80 p-4 gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('responses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'responses'
                  ? 'bg-white text-[#0B3C5D] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Student Responses</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {student_responses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('non_responders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'non_responders'
                  ? 'bg-white text-[#0B3C5D] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-red-500" />
              <span>Not Responded</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-800">
                {non_responders.length}
              </span>
            </button>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Section Filter */}
            <select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
            >
              <option value="all">All Sections</option>
              {section_breakdown.map(sec => (
                <option key={sec.section} value={sec.display_section}>
                  {sec.display_section}
                </option>
              ))}
            </select>

            {/* Option Filter (only in responses tab) */}
            {activeTab === 'responses' && (
              <select
                value={optionFilter}
                onChange={e => setOptionFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
              >
                <option value="all">All Options</option>
                {poll.options.map(opt => (
                  <option key={opt.id} value={opt.option_text}>
                    {opt.option_text}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="w-full sm:w-48">
              <SearchBar onSearchChange={setSearchQuery} placeholder="Filter student..." />
            </div>
          </div>
        </div>

        {/* TAB 1: Student Responses */}
        {activeTab === 'responses' && (
          <div className="p-4 sm:p-5 overflow-x-auto">
            {filteredStudentResponses.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">S.No</th>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Selected Option(s)</th>
                    <th className="py-2.5 px-3 text-right">Voted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {filteredStudentResponses.map((row, idx) => (
                    <tr key={row.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-normal">{idx + 1}</td>
                      <td className="py-3 px-3 text-[#0B3C5D] font-mono font-black">{row.roll_number}</td>
                      <td className="py-3 px-3 text-slate-800">{row.student_name}</td>
                      <td className="py-3 px-3 text-slate-600">{row.section}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {row.selected_options.map((opt, i) => (
                            <span key={i} className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-[#0B3C5D]/10 text-[#0B3C5D]">
                              {opt}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[10px]">
                        {new Date(row.voted_at).toLocaleDateString()} {new Date(row.voted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                No student responses match your current filter.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Not Responded */}
        {activeTab === 'non_responders' && (
          <div className="p-4 sm:p-5 overflow-x-auto">
            {filteredNonResponders.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">S.No</th>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {filteredNonResponders.map((row, idx) => (
                    <tr key={row.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-normal">{idx + 1}</td>
                      <td className="py-3 px-3 text-slate-700 font-mono">{row.roll_number}</td>
                      <td className="py-3 px-3 text-slate-800">{row.student_name}</td>
                      <td className="py-3 px-3 text-slate-600">{row.section}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                          Not Responded
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                All eligible students have submitted their votes!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PollAnalytics;
