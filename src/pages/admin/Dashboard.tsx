import React, { useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../features/auth/useAuth';
import { useStudents } from '../../features/auth/hooks/useStudents';
import { useAdminPosts } from '../../features/posts/hooks/useAdminPosts';
import { Users, ClipboardList, AlertCircle, ShieldCheck, TrendingUp, Calendar, ArrowRight, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: posts, isLoading: loadingPosts } = useAdminPosts();
  const [activeSectionTab, setActiveSectionTab] = useState<string>('AIML-A');


  // Compute metrics from real database state
  const totalStudents = students ? students.length : 0;
  const activeOpportunities = posts 
    ? posts.filter(p => p.is_active && p.post_type === 'opportunity').length 
    : 0;
  const topPriorityCount = posts 
    ? posts.filter(p => p.is_active && p.is_top_priority).length 
    : 0;
  const oiaEligibleCount = students 
    ? students.filter(s => s.oia_eligible).length 
    : 0;

  // Compile section counts dynamically
  const sectionList = ['AIML-A', 'AIML-B', 'AIML-C', 'AIML-D', 'AIML-E', 'AIML-F'];

  // Stagger entry configurations
  const containerVariants: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  const activeSectionCount = students
    ? students.filter(s => s.section === activeSectionTab).length
    : 0;

  const radius = 54;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const fillPercent = Math.max(activeSectionCount / 10, 0.05); // ensure at least a small hint of progress
  const strokeDashoffset = circumference - (fillPercent * circumference);

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12 px-4 sm:px-0">
      
      {/* Welcome Banner */}
      <div className="bg-[#0B3C5D] text-white p-6 rounded-2xl shadow-md border border-white/5 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-5 pointer-events-none">
          <GraduationCap className="h-64 w-64 text-[#D9B310]" />
        </div>
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />

        <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
          Welcome, {profile?.full_name?.split(' ')[0] || 'Coordinator'} 👋
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-xl font-medium leading-relaxed">
          Manage placement opportunity streams, registrations, resources, and track student eligibility metrics.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Mobile Horizontal Swipe Slider */}
        <div className="sm:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 -mx-4 px-4 pb-3 select-none">
          <motion.div variants={itemVariants} className="w-[70vw] max-w-[240px] shrink-0 snap-start">
            <StatCard
              title="Total Students"
              value={loadingStudents ? '...' : String(totalStudents)}
              icon={<Users className="h-4 w-4 text-primary" />}
              description="AIML branch"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="w-[70vw] max-w-[240px] shrink-0 snap-start">
            <StatCard
              title="Active Opportunities"
              value={loadingPosts ? '...' : String(activeOpportunities)}
              icon={<ClipboardList className="h-4 w-4 text-primary" />}
              description="Recruitment drives"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="w-[70vw] max-w-[240px] shrink-0 snap-start">
            <StatCard
              title="Priority Alerts"
              value={loadingPosts ? '...' : String(topPriorityCount)}
              icon={<AlertCircle className="h-4 w-4 text-[#A91D22]" />}
              description="Active urgent notices"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="w-[70vw] max-w-[240px] shrink-0 snap-start">
            <StatCard
              title="OIA Eligible Students"
              value={loadingStudents ? '...' : String(oiaEligibleCount)}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
              description="Authorized OIA list"
            />
          </motion.div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-5">
          <motion.div variants={itemVariants}>
            <StatCard
              title="Total Students"
              value={loadingStudents ? '...' : String(totalStudents)}
              icon={<Users className="h-4 w-4 text-primary" />}
              description="AIML branch"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Opportunities"
              value={loadingPosts ? '...' : String(activeOpportunities)}
              icon={<ClipboardList className="h-4 w-4 text-primary" />}
              description="Recruitment drives"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <StatCard
              title="Priority Alerts"
              value={loadingPosts ? '...' : String(topPriorityCount)}
              icon={<AlertCircle className="h-4 w-4 text-[#A91D22]" />}
              description="Active urgent notices"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <StatCard
              title="OIA Eligible Students"
              value={loadingStudents ? '...' : String(oiaEligibleCount)}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
              description="Authorized OIA list"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Double column grid for reviews and chart summaries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left Column: Recent Postings list */}
        <Card elevation={2} className="lg:col-span-2 border border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-50/20 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-800 tracking-widest uppercase">
              Recent Placement Notices
            </h3>
            <button
              onClick={() => navigate('/admin/posts')}
              className="text-[10px] font-black uppercase tracking-wider text-primary border border-slate-250 hover:bg-slate-50 rounded-lg px-2.5 py-1 transition-all active:scale-95 shadow-sm"
            >
              View All
            </button>
          </CardHeader>
          <CardBody className="p-0">
            {loadingPosts ? (
              <div className="p-8 space-y-4">
                {[1, 2].map(idx => (
                  <div key={idx} className="h-10 rounded-xl bg-slate-50 animate-pulse border border-slate-100" />
                ))}
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-semibold">
                No notices published yet. Click "Create Post" to publish.
              </div>
            ) : (
              <div className="divide-y divide-slate-100/80">
                {posts.slice(0, 4).map((notice) => {
                  const company = notice.company_name || 'Anurag University';
                  const firstLetter = company.charAt(0).toUpperCase();
                  
                  // Soft, premium monogram box colors based on post category
                  let monogramStyle = 'bg-slate-50 text-slate-500 border border-slate-200/60';
                  if (notice.post_type === 'opportunity') {
                    monogramStyle = 'bg-blue-50/70 text-blue-600 border border-blue-100/50';
                  } else if (notice.post_type === 'oia') {
                    monogramStyle = 'bg-purple-50/70 text-purple-600 border border-purple-100/50';
                  }

                  return (
                    <div 
                      key={notice.id} 
                      onClick={() => navigate('/admin/posts')}
                      className="group flex items-center justify-between p-4 hover:bg-slate-50/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-all cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Company Monogram Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm transition-transform group-hover:scale-105 duration-200 ${monogramStyle}`}>
                          {firstLetter}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                            {notice.company_name ? `${notice.company_name} — ${notice.opportunity_title}` : notice.opportunity_title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{new Date(notice.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span className="capitalize">{notice.post_type}</span>
                            {notice.is_top_priority && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 font-bold">Priority</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 ml-4 shrink-0 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
              <button
                type="button"
                onClick={() => navigate('/admin/posts')}
                className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 active:scale-95"
              >
                <span>Notice board manager</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardBody>
        </Card>
 
        {/* Right Column: Section Distribution Chart */}
        <Card elevation={2} className="border border-slate-200/80 shadow-sm overflow-hidden flex flex-col rounded-2xl">
          <CardHeader className="bg-slate-50/20 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-800 tracking-widest uppercase">
              Roster Distribution
            </h3>
            <Badge variant="neutral" className="text-[9px] py-0.5">Sections</Badge>
          </CardHeader>
          
          <CardBody className="flex flex-col items-center justify-center p-6 flex-grow">
            {loadingStudents ? (
              <div className="h-48 w-full flex items-center justify-center">
                <span className="text-xs text-slate-400 font-semibold animate-pulse">Calculating Roster...</span>
              </div>
            ) : (
              <>
                {/* Section Selection Tabs */}
                <div className="flex border-b border-slate-100 w-full mb-6 select-none overflow-x-auto scrollbar-none relative">
                  {sectionList.map((secName) => {
                    const isActive = activeSectionTab === secName;
                    const letter = secName.split('-')[1]; // A, B, C, D, E, F
                    return (
                      <button
                        key={secName}
                        type="button"
                        onClick={() => setActiveSectionTab(secName)}
                        className={`flex-1 min-w-[36px] text-center pb-2.5 text-xs font-bold transition-all relative ${
                          isActive ? 'text-primary font-black' : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        <span>{letter}</span>
                        {isActive && (
                          <motion.div 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            className="absolute bottom-0 inset-x-1.5 h-0.5 bg-primary rounded-full origin-center"
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Donut Chart SVG Progress Ring */}
                <div className="relative flex items-center justify-center h-40 w-full select-none">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      stroke="#F1F5F9"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                    <motion.circle
                      cx="72"
                      cy="72"
                      r={radius}
                      stroke="#0B3C5D"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </svg>
                  
                  {/* Count Centered Inside Circle */}
                  <div className="absolute flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.span 
                        key={activeSectionTab}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-4xl font-extrabold text-slate-800 leading-none"
                      >
                        {activeSectionCount}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest leading-none">
                      Students
                    </span>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-[10px] font-black uppercase text-emerald-600 flex items-center justify-center gap-1.5 tracking-wider">
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span>Live Section Counts</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[210px] leading-relaxed font-semibold">
                    Student distribution across sections dynamically in real time.
                  </p>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
export default Dashboard;
