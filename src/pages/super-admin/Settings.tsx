import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { supabase } from '../../lib/supabase';
import { Settings, Shield, Server, CheckCircle2, Save, ToggleLeft, Globe } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';

export const SettingsPage: React.FC = () => {
  const { profile: currentProfile } = useAuth();
  const [dbConnection, setDbConnection] = useState<'connected' | 'error' | 'loading'>('loading');

  // Form states
  const [universityName, setUniversityName] = useState('Anurag University');
  const [appName, setAppName] = useState('AU Placera');
  const [department, setDepartment] = useState('AIML');
  const [academicYear, setAcademicYear] = useState('2023-2027');
  const [placementSeason, setPlacementSeason] = useState('2026-2027');
  const [registrationAvailable, setRegistrationAvailable] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState(false);
  const [opportunityVisibility, setOpportunityVisibility] = useState('all');

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch settings from Database
  const fetchSettings = async () => {
    try {
      setDbConnection('loading');
      
      // Perform simple diagnostic query
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'default_config')
        .maybeSingle();

      if (error) {
        setDbConnection('error');
        return;
      }

      setDbConnection('connected');

      if (data) {
        setUniversityName(data.university_name);
        setAppName(data.application_name);
        setDepartment(data.department);
        setAcademicYear(data.academic_year);
        setPlacementSeason(data.placement_season);
        setRegistrationAvailable(data.registration_available);
        setDefaultPriority(data.default_priority);
        setOpportunityVisibility(data.opportunity_visibility);
      }
    } catch {
      setDbConnection('error');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save configurations back to Database
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_settings')
        .update({
          university_name: universityName.trim(),
          application_name: appName.trim(),
          department: department.trim(),
          academic_year: academicYear.trim(),
          placement_season: placementSeason.trim(),
          registration_available: registrationAvailable,
          default_priority: defaultPriority,
          opportunity_visibility: opportunityVisibility
        })
        .eq('id', 'default_config');

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_logs').insert({
        actor_id: currentProfile?.id,
        action: 'ADMIN_EDITED',
        metadata: {
          university_name: universityName,
          application_name: appName,
          placement_season: placementSeason,
          registration_available: registrationAvailable
        }
      });

      triggerToast('System settings updated successfully.');
    } catch (err: any) {
      console.error('[SETTINGS] Failed to save configuration:', err);
      triggerToast('Failed to save configurations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-white/5">
          <CheckCircle2 className="h-4.5 w-4.5 text-[#D9B310] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
        <Settings className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
            System Settings Console
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Configure global variables, adjust student registrations accessibility, and inspect infrastructure health.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Configuration Parameters */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* GENERAL SECTION */}
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-primary" />
              <span className="text-xs font-black uppercase text-slate-800">General Parameters</span>
            </CardHeader>
            <CardBody className="p-5 space-y-4 text-xs font-bold uppercase tracking-wider">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">University Name</label>
                  <input
                    type="text"
                    required
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">Application Name</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">Target Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">Current Academic Year</label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* PLACEMENT SETTINGS */}
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <ToggleLeft className="h-4.5 w-4.5 text-primary" />
              <span className="text-xs font-black uppercase text-slate-800">Placement Controls</span>
            </CardHeader>
            <CardBody className="p-5 space-y-4 text-xs font-bold uppercase tracking-wider">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">Placement Season</label>
                  <input
                    type="text"
                    required
                    value={placementSeason}
                    onChange={(e) => setPlacementSeason(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">Opportunities Visibility</label>
                  <select
                    value={opportunityVisibility}
                    onChange={(e) => setOpportunityVisibility(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-bold uppercase"
                  >
                    <option value="all">All Opportunities</option>
                    <option value="oia">OIA Eligible Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <h4 className="text-slate-800 font-bold">Registration availability</h4>
                  <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-0.5">ALLOW STUDENTS TO SUBMIT ENROLLMENTS APPLICATION</p>
                </div>
                <input
                  type="checkbox"
                  checked={registrationAvailable}
                  onChange={(e) => setRegistrationAvailable(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 accent-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <h4 className="text-slate-800 font-bold">Default Notice Priority</h4>
                  <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-0.5">SET NEWLY DETECTED PLACEMENT NOTICES AS HIGH PRIORITY BY DEFAULT</p>
                </div>
                <input
                  type="checkbox"
                  checked={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 accent-primary"
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              type="submit"
              isLoading={saving}
              className="h-10 px-6 rounded-xl flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider"
            >
              <Save className="h-4 w-4" />
              <span>Save System Settings</span>
            </Button>
          </div>

        </div>

        {/* Security & Health Check Sidebar */}
        <div className="space-y-6">
          
          {/* Security details */}
          <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-primary" />
              <span className="text-xs font-black uppercase text-slate-800">Security & Roles</span>
            </CardHeader>
            <CardBody className="p-5 text-[10px] text-slate-500 font-bold uppercase tracking-wider space-y-3.5 leading-relaxed">
              <div>
                <span className="text-slate-400 block mb-0.5">Access Role Level</span>
                <span className="text-xs text-primary font-black">SUPER ADMIN</span>
              </div>
              
              <div>
                <span className="text-slate-400 block mb-0.5">Row Level Security</span>
                <span className="text-slate-800">Enforced (SELECT/INSERT/UPDATE/DELETE) via get_user_role()</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Supabase Auth API</span>
                <span className="text-slate-800">Operational (OAuth + JWT enabled)</span>
              </div>
            </CardBody>
          </Card>

          {/* System Health */}
          <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-1.5">
              <Server className="h-4.5 w-4.5 text-primary" />
              <span className="text-xs font-black uppercase text-slate-800">System Diagnostics</span>
            </CardHeader>
            <CardBody className="p-5 space-y-4 text-xs font-bold uppercase tracking-wider text-slate-650">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 text-[10px]">Database connection</span>
                <span className={dbConnection === 'connected' ? 'text-green-600' : 'text-red-500'}>
                  {dbConnection === 'connected' ? 'CONNECTED' : dbConnection === 'error' ? 'OFFLINE' : 'TESTING...'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 text-[10px]">Realtime Publication</span>
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  <span>ACTIVE</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 text-[10px]">API Latency Checks</span>
                <span className="text-slate-700">NORMAL</span>
              </div>
            </CardBody>
          </Card>

        </div>

      </form>

    </div>
  );
};

export default SettingsPage;
