import React from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../features/auth/useAuth';
import { useStudents } from '../../features/auth/hooks/useStudents';
import { useAdminPosts } from '../../features/posts/hooks/useAdminPosts';
import { Users, ClipboardList, AlertCircle, ShieldCheck, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: posts, isLoading: loadingPosts } = useAdminPosts();

  // Greeting helper based on time
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
  const sectionList = ['AIML-A', 'AIML-B', 'AIML-C', 'AIML-D', 'AIML-E'];
  const maxCount = students 
    ? Math.max(...sectionList.map(s => students.filter(student => student.section === s).length), 1)
    : 1;

  // Stagger entry configurations
  const containerVariants: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12 px-4 sm:px-0">
      
      {/* Dynamic Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Coordinator'} 👋
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Anurag University AIML placement metrics and notices summary.
          </p>
        </div>
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
            <Badge variant="primary" className="text-[9px] py-0.5">Live DB</Badge>
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
                {posts.slice(0, 4).map((notice) => (
                  <div 
                    key={notice.id} 
                    onClick={() => navigate('/admin/posts')}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/40 transition-all cursor-pointer select-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
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
                    <ArrowRight className="h-4 w-4 text-slate-300 ml-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
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
              <div className="h-36 w-full flex items-center justify-center">
                <span className="text-xs text-slate-400 font-semibold animate-pulse">Calculating Roster...</span>
              </div>
            ) : (
              <>
                {/* Dynamic Section Chart Bars */}
                <div className="flex items-end gap-3 h-36 w-full max-w-[220px] border-b border-slate-200 pb-2 px-2 select-none">
                  {sectionList.map((secName) => {
                    const count = students ? students.filter(s => s.section === secName).length : 0;
                    const percent = Math.max((count / maxCount) * 100, 3); // minimum 3% for styling
                    
                    return (
                      <div key={secName} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        {/* Hover count indicator popup */}
                        <div className="absolute -top-7 scale-0 group-hover:scale-100 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg shadow-md pointer-events-none transition-transform duration-100">
                          {count}
                        </div>
                        <div 
                          className="w-full bg-slate-200 hover:bg-primary rounded-t-lg transition-all duration-300 relative" 
                          style={{ height: `${percent}%` }}
                        />
                        <span className="text-[9px] text-slate-400 font-black tracking-wider mt-1.5">
                          {secName.split('-')[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-5 text-center">
                  <p className="text-xs font-black uppercase text-slate-700 flex items-center justify-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Live Section Counts</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed font-semibold">
                    Student distributions are tracked dynamically in real-time.
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
