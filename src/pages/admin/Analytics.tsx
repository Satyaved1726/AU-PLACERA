import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../features/analytics/analyticsService';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { SearchBar } from '../../components/common/SearchBar';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Users, 
  ClipboardList, 
  Calendar, 
  Percent, 
  RefreshCw, 
  ListFilter,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Analytics: React.FC = () => {
  // 1. Fetch live analytics payload via React Query
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['analyticsData'],
    queryFn: () => analyticsService.getAnalyticsData(),
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });

  // 2. Filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'visuals' | 'roster'>('visuals');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const students = data?.students || [];
  const posts = data?.posts || [];
  const registrations = data?.registrations || [];

  // 3. Denormalize registration data for unified filter applications
  const denormalizedRegs = registrations.map(reg => {
    const student = students.find(s => s.id === reg.student_id);
    const post = posts.find(p => p.id === reg.post_id);
    return {
      id: reg.id,
      registeredAt: reg.registered_at,
      studentId: reg.student_id,
      postId: reg.post_id,
      studentName: student?.full_name || 'Student User',
      rollNumber: student?.roll_number || 'N/A',
      studentEmail: student?.email || 'N/A',
      section: student?.section || 'N/A',
      year: student?.year || 0,
      companyName: post?.company_name || 'N/A',
      opportunityTitle: post?.opportunity_title || 'N/A',
      postType: post?.post_type || 'N/A'
    };
  });

  // 4. Apply filters reactive pipeline
  const filteredRegs = denormalizedRegs.filter(reg => {
    // Date filters
    if (startDate) {
      const regTime = new Date(reg.registeredAt).getTime();
      const startTime = new Date(startDate).getTime();
      if (regTime < startTime) return false;
    }
    if (endDate) {
      const regTime = new Date(reg.registeredAt).getTime();
      const endTime = new Date(endDate + 'T23:59:59').getTime();
      if (regTime > endTime) return false;
    }

    // Section filter
    if (sectionFilter !== 'All' && reg.section !== sectionFilter) {
      return false;
    }


    // Text search filter (matches student name, roll number, company name, or opportunity title)
    if (searchQuery) {
      const sQuery = searchQuery.toLowerCase();
      const matches = (
        reg.studentName.toLowerCase().includes(sQuery) ||
        reg.rollNumber.toLowerCase().includes(sQuery) ||
        reg.studentEmail.toLowerCase().includes(sQuery) ||
        reg.companyName.toLowerCase().includes(sQuery) ||
        reg.opportunityTitle.toLowerCase().includes(sQuery)
      );
      if (!matches) return false;
    }

    return true;
  });

  // Filter students based on section/year to determine local participation pool
  const filteredStudents = students.filter(student => {
    if (sectionFilter !== 'All' && student.section !== sectionFilter) return false;
    return true;
  });

  // Filter posts based on date range
  const filteredPosts = posts.filter(post => {
    if (startDate) {
      const postTime = new Date(post.created_at).getTime();
      const startTime = new Date(startDate).getTime();
      if (postTime < startTime) return false;
    }
    if (endDate) {
      const postTime = new Date(post.created_at).getTime();
      const endTime = new Date(endDate + 'T23:59:59').getTime();
      if (postTime > endTime) return false;
    }
    return true;
  });

  // 5. Calculate real KPIs based on current active filters
  const totalRegistrations = filteredRegs.length;
  const totalDrives = filteredPosts.length;
  const avgRegsPerDrive = totalDrives > 0 ? (totalRegistrations / totalDrives).toFixed(1) : '0';
  const uniqueStudentsRegistered = new Set(filteredRegs.map(r => r.studentId)).size;
  const participationRate = filteredStudents.length > 0 
    ? Math.round((uniqueStudentsRegistered / filteredStudents.length) * 100) 
    : 0;

  // 6. Aggregate Chart Data
  // Section breakdown
  const sectionChartData = ['AIML-A', 'AIML-B', 'AIML-C', 'AIML-D', 'AIML-E'].map(sec => ({
    name: sec.replace('AIML-', 'Sec '),
    Registrations: filteredRegs.filter(r => r.section === sec).length
  }));

  // Year breakdown
  const yearChartData = [1, 2, 3, 4].map(yr => ({
    name: `Year ${yr}`,
    Registrations: filteredRegs.filter(r => r.year === yr).length
  }));

  // Company performance
  const companyCountsMap: Record<string, number> = {};
  filteredRegs.forEach(reg => {
    const compName = reg.companyName || 'Unknown';
    companyCountsMap[compName] = (companyCountsMap[compName] || 0) + 1;
  });
  const companyChartData = Object.entries(companyCountsMap)
    .map(([name, Registrations]) => ({ name, Registrations }))
    .sort((a, b) => b.Registrations - a.Registrations)
    .slice(0, 8);

  // Registration Trend over time
  const trendMap: Record<string, { count: number; rawDate: string }> = {};
  filteredRegs.forEach(reg => {
    const dateStr = new Date(reg.registeredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!trendMap[dateStr]) {
      trendMap[dateStr] = { count: 0, rawDate: reg.registeredAt };
    }
    trendMap[dateStr].count += 1;
  });
  const trendChartData = Object.entries(trendMap)
    .map(([date, info]) => ({
      date,
      Registrations: info.count,
      timestamp: new Date(info.rawDate).getTime()
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // 7. Reset filters helper
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSectionFilter('All');
    setSearchQuery('');
    triggerToast('All filters have been reset.');
  };

  // 8. Filter-aware exports (CSV and Excel)
  const getExportData = () => {
    return filteredRegs.map(r => ({
      'Student Name': r.studentName,
      'Roll Number': r.rollNumber,
      'College Email': r.studentEmail,
      'Section': r.section,
      'Year': r.year,
      'Company Name': r.companyName,
      'Opportunity Title': r.opportunityTitle,
      'Registered Date': new Date(r.registeredAt).toLocaleDateString()
    }));
  };

  const handleExportCSV = () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
      triggerToast('No records available to export.');
      return;
    }

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row)
        .map(val => `"${String(val ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );

    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AU_Placera_Registrations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast('Successfully exported data to CSV.');
  };

  const handleExportExcel = () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
      triggerToast('No records available to export.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations Roster');
    
    XLSX.writeFile(workbook, `AU_Placera_Registrations_${Date.now()}.xlsx`);
    
    triggerToast('Successfully exported data to Excel.');
  };

  // Stagger animation configurations
  const containerVariants: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-bold flex items-center gap-2 border border-white/5"
          >
            <CheckCircle2 className="h-4 w-4 text-[#D9B310] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase tracking-wide">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Placement Analytics & Roster</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Monitor real recruitment trends, review section-wise and year-wise participation, and export datasets.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              refetch();
              triggerToast('Database reloaded successfully.');
            }}
            disabled={isLoading || isRefetching}
            className="h-9 px-3.5 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 select-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-650 uppercase tracking-widest border-b border-slate-100 pb-2.5">
          <ListFilter className="h-4 w-4 text-slate-400" />
          <span>Search & Filters</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Start Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="au-input h-9 px-3 py-0 text-xs font-semibold text-slate-700 bg-white"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="au-input h-9 px-3 py-0 text-xs font-semibold text-slate-700 bg-white"
            />
          </div>

          {/* Section Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Section</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="au-input h-9 px-3 py-0 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="All">All Sections</option>
              <option value="AIML-A">AIML-A</option>
              <option value="AIML-B">AIML-B</option>
              <option value="AIML-C">AIML-C</option>
              <option value="AIML-D">AIML-D</option>
              <option value="AIML-E">AIML-E</option>
              <option value="AIML-F">AIML-F</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Search Text</label>
            <SearchBar 
              onSearchChange={setSearchQuery} 
              className="w-full" 
            />
          </div>
        </div>

        {/* Action buttons (reset and export options) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            Filtered: {filteredRegs.length} of {denormalizedRegs.length} entries
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-9 px-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none active:scale-95"
            >
              Reset Filters
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all select-none active:scale-95 shadow-sm"
            >
              <FileDown className="h-4 w-4 text-slate-455 shrink-0" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="h-9 px-4 bg-emerald-50 border border-emerald-150 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all select-none active:scale-95 shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-155 text-red-700 text-xs font-semibold rounded-xl">
          Failed to load real-time database stats. Check your Supabase server connection or local cache settings.
        </div>
      )}

      {/* LOADING STATE SKELETON */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(idx => (
              <div key={idx} className="h-24 rounded-2xl bg-slate-200/60 border border-slate-200" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-72 rounded-2xl bg-slate-200/60 border border-slate-200" />
            <div className="h-72 rounded-2xl bg-slate-200/60 border border-slate-200" />
          </div>
        </div>
      )}

      {/* CONTENT VIEWS */}
      {!isLoading && !error && (
        <>
          {/* KPI Summary Cards Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <motion.div variants={itemVariants}>
              <StatCard
                title="Active Drives"
                value={totalDrives}
                icon={<ClipboardList className="h-4 w-4 text-primary" />}
                description="Total active options"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                title="Registrations"
                value={totalRegistrations}
                icon={<Users className="h-4 w-4 text-primary" />}
                description="Filtered applications"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                title="Avg per Drive"
                value={avgRegsPerDrive}
                icon={<Calendar className="h-4 w-4 text-primary" />}
                description="Avg candidate turnout"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                title="Unique Students"
                value={uniqueStudentsRegistered}
                icon={<Users className="h-4 w-4 text-primary" />}
                description="With at least 1 registration"
              />
            </motion.div>

            <motion.div variants={itemVariants} className="col-span-2 lg:col-span-1">
              <StatCard
                title="Participation"
                value={`${participationRate}%`}
                icon={<Percent className="h-4 w-4 text-emerald-600" />}
                description="Of total student pool"
              />
            </motion.div>
          </motion.div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200/80">
            <button
              onClick={() => setActiveTab('visuals')}
              className={`py-3 px-4 font-black text-[10px] uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'visuals'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              Visual Analytics Charts
            </button>
            
            <button
              onClick={() => setActiveTab('roster')}
              className={`py-3 px-4 font-black text-[10px] uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'roster'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              Registered Students Roster ({filteredRegs.length})
            </button>
          </div>

          {/* TAB 1: VISUAL ANALYTICS */}
          {activeTab === 'visuals' && (
            <div className="space-y-6">
              
              {/* Trend Chart (Full Width) */}
              <Card elevation={2} className="border border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/20 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-800 tracking-widest uppercase">
                    Registration Trend Over Time
                  </h3>
                  <Badge variant="neutral">Timeline Analysis</Badge>
                </CardHeader>
                <CardBody className="p-4 sm:p-6">
                  {trendChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-semibold">
                      No trend data available for selected date filters.
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} 
                            stroke="#E2E8F0"
                          />
                          <YAxis 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} 
                            stroke="#E2E8F0"
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0B3C5D', 
                              borderRadius: '12px', 
                              border: 'none', 
                              color: 'white',
                              fontSize: '10px',
                              fontWeight: '800'
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Registrations" 
                            stroke="#0B3C5D" 
                            strokeWidth={3} 
                            dot={{ r: 4, stroke: '#328CC1', strokeWidth: 2, fill: 'white' }}
                            activeDot={{ r: 6 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Multi-Column Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Section wise breakdowns */}
                <Card elevation={2} className="border border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
                  <CardHeader className="bg-slate-50/20 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-800 tracking-widest uppercase">
                      Section-wise Registrations
                    </h3>
                    <Badge variant="neutral">AIML Sections</Badge>
                  </CardHeader>
                  
                  <CardBody className="p-4">
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sectionChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} 
                            stroke="#E2E8F0"
                          />
                          <YAxis 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} 
                            stroke="#E2E8F0"
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0B3C5D', 
                              borderRadius: '12px', 
                              border: 'none', 
                              color: 'white',
                              fontSize: '10px',
                              fontWeight: '800'
                            }} 
                          />
                          <Bar dataKey="Registrations" fill="#328CC1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                {/* Year wise Breakdown */}
                <Card elevation={2} className="border border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
                  <CardHeader className="bg-slate-50/20 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-800 tracking-widest uppercase">
                      Year-wise Registrations
                    </h3>
                    <Badge variant="neutral">Academic Year</Badge>
                  </CardHeader>
                  
                  <CardBody className="p-4">
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} 
                            stroke="#E2E8F0"
                          />
                          <YAxis 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} 
                            stroke="#E2E8F0"
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0B3C5D', 
                              borderRadius: '12px', 
                              border: 'none', 
                              color: 'white',
                              fontSize: '10px',
                              fontWeight: '800'
                            }} 
                          />
                          <Bar dataKey="Registrations" fill="#0B3C5D" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                {/* Company performance ranker */}
                <Card elevation={2} className="lg:col-span-2 border border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
                  <CardHeader className="bg-slate-50/20 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-800 tracking-widest uppercase">
                      Top Recruitment Drives
                    </h3>
                    <Badge variant="neutral">Ranked Drives</Badge>
                  </CardHeader>
                  
                  <CardBody className="p-4 sm:p-6">
                    {companyChartData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-semibold">
                        No registrations found for any company.
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={companyChartData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                            <XAxis 
                              type="number" 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} 
                              stroke="#E2E8F0"
                              allowDecimals={false}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} 
                              stroke="#E2E8F0" 
                              width={80}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#0B3C5D', 
                                borderRadius: '12px', 
                                border: 'none', 
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: '800'
                              }} 
                            />
                            <Bar dataKey="Registrations" fill="#D9B310" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardBody>
                </Card>

              </div>
            </div>
          )}

          {/* TAB 2: DETAILED ROSTER LIST */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              
              {/* Roster Empty State */}
              {filteredRegs.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl p-8 max-w-sm mx-auto">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No registrations found</h3>
                  <p className="text-[10px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                    Try adjusting search query or dashboard filter constraints.
                  </p>
                </div>
              ) : (
                <>
                  {/* MOBILE LIST LAYOUT (md:hidden) */}
                  <div className="grid grid-cols-1 gap-4 md:hidden select-none">
                    {filteredRegs.map(reg => (
                      <div 
                        key={reg.id} 
                        className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm hover:border-slate-350 transition-all space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-black text-slate-800 leading-tight">
                              {reg.studentName}
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-1">
                              {reg.rollNumber} • {reg.section} • Year {reg.year}
                            </span>
                          </div>
                          
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 text-slate-455 py-0.5 px-2 rounded-lg shrink-0">
                            {new Date(reg.registeredAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="border-t border-slate-100/60 pt-2 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Drive Details</span>
                          <span className="font-extrabold text-primary truncate max-w-[200px]">
                            {reg.companyName} — {reg.opportunityTitle}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP TABLE VIEW (md:block hidden) */}
                  <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse select-none">
                      <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-5 py-3.5">Student</th>
                          <th className="px-5 py-3.5">Roll No</th>
                          <th className="px-5 py-3.5">Section</th>
                          <th className="px-5 py-3.5">Year</th>
                          <th className="px-5 py-3.5">Recruiter / Drive Info</th>
                          <th className="px-5 py-3.5">Registration Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {filteredRegs.map(reg => (
                          <tr key={reg.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-3.5 text-slate-800 font-extrabold">{reg.studentName}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-500 font-bold">{reg.rollNumber}</td>
                            <td className="px-5 py-3.5 text-slate-650">{reg.section}</td>
                            <td className="px-5 py-3.5 text-slate-400">Yr {reg.year}</td>
                            <td className="px-5 py-3.5 font-extrabold text-primary">
                              {reg.companyName} — {reg.opportunityTitle}
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 font-bold">
                              {new Date(reg.registeredAt).toLocaleString(undefined, { 
                                dateStyle: 'short', 
                                timeStyle: 'short' 
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default Analytics;

// Helper badge component for UI styles
const Badge: React.FC<{ children: React.ReactNode; variant?: 'primary' | 'neutral', className?: string }> = ({ 
  children, 
  variant = 'primary',
  className = ''
}) => {
  return (
    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border ${
      variant === 'primary' 
        ? 'bg-primary/5 text-primary border-primary/20' 
        : 'bg-slate-100 text-slate-500 border-slate-200'
    } ${className}`}>
      {children}
    </span>
  );
};
