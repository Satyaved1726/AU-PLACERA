import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../features/auth/useAuth';
import { supabase } from '../../lib/supabase';
import { Shield, Users, UserCheck, ArrowRight, Briefcase, Bookmark, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AuditLog {
  id: string;
  actor_id: string;
  target_admin_id: string | null;
  action: 'ADMIN_CREATED' | 'ADMIN_ACTIVATED' | 'ADMIN_DEACTIVATED' | 'ADMIN_ROLE_CHANGED' | 'ADMIN_DELETED';
  metadata: any;
  created_at: string;
  actor?: { full_name: string };
  target?: { full_name: string };
}

interface RegistrationRecord {
  id: string;
  registered_at: string;
  student: {
    full_name: string;
    email: string;
  };
  post: {
    opportunity_title: string;
    company_name: string;
  };
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  useAuth();

  // Metrics states
  const [totalAdmins, setTotalAdmins] = useState<number | null>(null);
  const [activeAdmins, setActiveAdmins] = useState<number | null>(null);
  const [suspendedAdmins, setSuspendedAdmins] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [totalOpportunities, setTotalOpportunities] = useState<number | null>(null);
  const [activeOpportunities, setActiveOpportunities] = useState<number | null>(null);
  const [totalRegistrations, setTotalRegistrations] = useState<number | null>(null);
  const [totalAnnouncements, setTotalAnnouncements] = useState<number | null>(null);

  // Lists states
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charts states
  const [registrationChartData, setRegistrationChartData] = useState<any[]>([]);
  const [adminActivityChartData, setAdminActivityChartData] = useState<any[]>([]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 1. Coordinators metrics
      const { count: tAdmins } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      setTotalAdmins(tAdmins);

      const { count: actAdmins } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'active');
      setActiveAdmins(actAdmins);

      const { count: suspAdmins } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'suspended');
      setSuspendedAdmins(suspAdmins);

      // 2. Students count
      const { count: tStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      setTotalStudents(tStudents);

      // 3. Opportunities metrics
      const { count: tOpps } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('post_type', 'opportunity');
      setTotalOpportunities(tOpps);

      const { count: actOpps } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('post_type', 'opportunity')
        .eq('is_active', true);
      setActiveOpportunities(actOpps);

      // 4. Registrations count
      const { count: tRegs } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true });
      setTotalRegistrations(tRegs);

      // 5. Announcements count
      const { count: tAnnounces } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('post_type', 'announcement');
      setTotalAnnouncements(tAnnounces);

      // 6. Recent Logs
      const { data: logsData } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          actor:profiles!actor_id(full_name),
          target:profiles!target_admin_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentLogs(logsData as any[] || []);

      // 7. Recent registrations list
      const { data: regsData } = await supabase
        .from('registrations')
        .select(`
          id,
          registered_at,
          student:profiles!student_id (
            full_name,
            email
          ),
          post:posts!post_id (
            opportunity_title,
            company_name
          )
        `)
        .order('registered_at', { ascending: false })
        .limit(5);
      setRecentRegistrations(regsData as any[] || []);

      // 8. Generate registrations chart data (grouped by date)
      const { data: allRegs } = await supabase
        .from('registrations')
        .select('registered_at')
        .order('registered_at', { ascending: true });
      
      const regMap: Record<string, number> = {};
      (allRegs || []).forEach(r => {
        const dateStr = new Date(r.registered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        regMap[dateStr] = (regMap[dateStr] || 0) + 1;
      });
      setRegistrationChartData(Object.entries(regMap).map(([date, count]) => ({ date, count })));



      // 10. Generate admin activity chart data
      const { data: allLogs } = await supabase
        .from('admin_activity_logs')
        .select('action');

      const logMap: Record<string, number> = {};
      (allLogs || []).forEach(l => {
        const readableAction = l.action.replace('ADMIN_', '');
        logMap[readableAction] = (logMap[readableAction] || 0) + 1;
      });
      setAdminActivityChartData(Object.entries(logMap).map(([name, value]) => ({ name, value })));

    } catch (err) {
      console.error('[SUPER_ADMIN] Error fetching console metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderActionText = (log: AuditLog) => {
    const targetName = log.target?.full_name || log.metadata?.full_name || 'Coordinator';

    switch (log.action) {
      case 'ADMIN_CREATED':
        return `Created coordinator ${targetName}`;
      case 'ADMIN_ACTIVATED':
        return `Activated access for ${targetName}`;
      case 'ADMIN_DEACTIVATED':
        return `Suspended access for ${targetName}`;
      case 'ADMIN_ROLE_CHANGED':
        return `Demoted coordinator ${targetName} to student`;
      case 'ADMIN_DELETED':
        return `Deleted credentials of coordinator ${targetName}`;
      default:
        return `System log event recorded`;
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12 px-4 sm:px-0">
      
      {/* Executive Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
              Super Admin Dashboard
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            System status overview, metrics insights, and recent registrations activity.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={totalStudents === null ? '...' : String(totalStudents)}
          icon={<Users className="h-4 w-4 text-primary" />}
          description="Registered profiles"
        />
        <StatCard
          title="Active/Total Admins"
          value={totalAdmins === null ? '...' : `${activeAdmins}/${totalAdmins}`}
          icon={<UserCheck className="h-4 w-4 text-green-600" />}
          description={`${suspendedAdmins || 0} suspended coordinators`}
        />
        <StatCard
          title="Active Opportunities"
          value={activeOpportunities === null ? '...' : `${activeOpportunities}/${totalOpportunities}`}
          icon={<Briefcase className="h-4 w-4 text-amber-500" />}
          description="Placement notices active"
        />
        <StatCard
          title="Total Applications"
          value={totalRegistrations === null ? '...' : String(totalRegistrations)}
          icon={<Bookmark className="h-4 w-4 text-indigo-500" />}
          description={`${totalAnnouncements || 0} announcements live`}
        />
      </div>

      {/* Chart Layout Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Line Trend */}
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4">
            <span className="text-xs font-black uppercase text-slate-800">Registration Trend</span>
          </CardHeader>
          <CardBody className="p-4 h-64">
            {registrationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold">No application data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationChartData}>
                  <defs>
                    <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorRegs)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Admin actions audit pie */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4">
            <span className="text-xs font-black uppercase text-slate-800">Admin Actions Audit</span>
          </CardHeader>
          <CardBody className="p-4 h-64 flex flex-col justify-between">
            {adminActivityChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold">No audit data yet.</div>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={adminActivityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {adminActivityChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[8px] font-black uppercase tracking-wider text-slate-450 mt-1">
                  {adminActivityChartData.map((item, idx) => (
                    <span key={item.name} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span>{item.name}: {item.value}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Applications table */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase text-slate-800 block">Recent Applications</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Live enrollment submissions</span>
            </div>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardBody className="p-0">
            {recentRegistrations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No applications submitted yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentRegistrations.map(reg => (
                  <div key={reg.id} className="p-4 flex justify-between items-center gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800">{reg.student.full_name}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                        {reg.post.company_name} • {reg.post.opportunity_title}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                      {formatTime(reg.registered_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Audit Log Stream */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase text-slate-800 block">System Activity Feed</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Audit logs tracking actions</span>
            </div>
            <button 
              onClick={() => navigate('/super-admin/activity')}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-secondary hover:text-secondary-dark tracking-wider transition-colors"
            >
              <span>View Logs</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardBody className="p-0">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No recent log entries.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-4.5 flex justify-between items-start gap-4">
                    <div className="flex gap-2.5">
                      <Badge 
                        variant={
                          log.action === 'ADMIN_CREATED' ? 'primary' :
                          log.action === 'ADMIN_ACTIVATED' ? 'success' :
                          log.action === 'ADMIN_DEACTIVATED' ? 'error' :
                          log.action === 'ADMIN_ROLE_CHANGED' ? 'warning' : 'neutral'
                        }
                        className="text-[8px] font-bold tracking-widest uppercase py-0.5 px-1.5 shrink-0"
                      >
                        {log.action.replace('ADMIN_', '')}
                      </Badge>
                      <div className="text-slate-700 font-semibold leading-relaxed">
                        {renderActionText(log)}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;
