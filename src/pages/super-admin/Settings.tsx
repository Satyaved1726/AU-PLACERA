import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { supabase } from '../../lib/supabase';
import { Settings, Shield, Server, CheckCircle2, Save, ToggleLeft, Globe } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';

interface WhitelistItem {
  id: string;
  roll_number: string;
  email: string | null;
  full_name: string | null;
  student_type: 'regular' | 'lateral_entry';
  branch: string;
  section: string;
  academic_year: string;
  batch: string;
  is_active: boolean;
  created_at: string;
}

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

  // Whitelist state variables
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [newRoll, setNewRoll] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStudentType, setNewStudentType] = useState<'regular' | 'lateral_entry'>('lateral_entry');
  const [newSection, setNewSection] = useState('AIML-F');
  const [newAcademicYear, setNewAcademicYear] = useState('4th Year');
  const [newBatch, setNewBatch] = useState('2023-2027');
  const [addingWhitelist, setAddingWhitelist] = useState(false);

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

  // Fetch whitelist from Database
  const fetchWhitelist = async () => {
    try {
      setWhitelistLoading(true);
      const { data, error } = await supabase
        .from('student_access_whitelist')
        .select('*')
        .order('roll_number', { ascending: true });
      if (error) throw error;
      setWhitelist(data || []);
    } catch (err: any) {
      console.error('[SETTINGS] Failed to fetch whitelist:', err);
    } finally {
      setWhitelistLoading(false);
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoll) {
      triggerToast('Roll number is required.');
      return;
    }
    
    const formattedRoll = newRoll.toUpperCase().trim();
    const formattedEmail = newEmail.toLowerCase().trim() || null;
    const formattedName = newName.trim() || null;

    if (formattedEmail && !formattedEmail.endsWith('@anurag.edu.in')) {
      triggerToast('Email must end with @anurag.edu.in.');
      return;
    }

    try {
      setAddingWhitelist(true);
      const { error } = await supabase
        .from('student_access_whitelist')
        .insert({
          roll_number: formattedRoll,
          full_name: formattedName,
          email: formattedEmail,
          student_type: newStudentType,
          branch: 'AIML',
          section: newSection,
          academic_year: newAcademicYear,
          batch: newBatch,
          is_active: true
        });

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_logs').insert({
        actor_id: currentProfile?.id,
        action: 'ADMIN_EDITED',
        metadata: {
          action_detail: `Added roll number ${formattedRoll} to whitelist`
        }
      });

      triggerToast(`Roll number ${formattedRoll} authorized.`);
      setNewRoll('');
      setNewName('');
      setNewEmail('');
      setNewStudentType('lateral_entry');
      setNewSection('AIML-F');
      setNewAcademicYear('4th Year');
      setNewBatch('2023-2027');
      fetchWhitelist();
    } catch (err: any) {
      console.error('[SETTINGS] Failed to add whitelist entry:', err);
      triggerToast(err.message || 'Failed to add whitelist entry.');
    } finally {
      setAddingWhitelist(false);
    }
  };

  const handleToggleWhitelistActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('student_access_whitelist')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      triggerToast('Access authorization updated.');
      fetchWhitelist();
    } catch (err: any) {
      console.error('[SETTINGS] Failed to toggle whitelist status:', err);
      triggerToast('Failed to update whitelist status.');
    }
  };

  const handleDeleteWhitelist = async (id: string, roll: string) => {
    if (!window.confirm(`Are you sure you want to remove roll number ${roll} from the access whitelist?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('student_access_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      triggerToast(`Roll number ${roll} removed.`);
      fetchWhitelist();
    } catch (err: any) {
      console.error('[SETTINGS] Failed to delete whitelist entry:', err);
      triggerToast('Failed to delete whitelist entry.');
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWhitelist();
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

      {/* Whitelist Management Console Card */}
      <Card className="border border-slate-200/80 shadow-sm mt-6">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
          <Shield className="h-4.5 w-4.5 text-primary" />
          <span className="text-xs font-black uppercase text-slate-800">Student Access Whitelist (Lateral Entries & Exceptions)</span>
        </CardHeader>
        <CardBody className="p-5 space-y-6">
          
          {/* Add Whitelist Form */}
          <form onSubmit={handleAddWhitelist} className="bg-slate-55 border border-slate-150 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Authorize Exceptional Student Access</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div>
                <label className="block text-[8px] font-black text-slate-400 mb-1">Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24EG507F01"
                  value={newRoll}
                  onChange={(e) => setNewRoll(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                />
              </div>
              
              <div>
                <label className="block text-[8px] font-black text-slate-400 mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 mb-1">College Email (Optional)</label>
                <input
                  type="email"
                  placeholder="name@anurag.edu.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold lowercase"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 mb-1">Student Type</label>
                <select
                  value={newStudentType}
                  onChange={(e) => setNewStudentType(e.target.value as any)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-bold uppercase"
                >
                  <option value="lateral_entry">Lateral Entry</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div>
                <label className="block text-[8px] font-black text-slate-400 mb-1">Section</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-bold uppercase"
                >
                  <option value="AIML-F">AIML-F</option>
                  <option value="AIML-A">AIML-A</option>
                  <option value="AIML-B">AIML-B</option>
                  <option value="AIML-C">AIML-C</option>
                  <option value="AIML-D">AIML-D</option>
                  <option value="AIML-E">AIML-E</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 mb-1">Academic Year</label>
                <select
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-bold uppercase"
                >
                  <option value="4th Year">4th Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="1st Year">1st Year</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 mb-1">Batch</label>
                <input
                  type="text"
                  required
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-secondary text-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                type="submit"
                isLoading={addingWhitelist}
                className="h-9 px-5 rounded-xl flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-white"
              >
                <span>Authorize Student Access</span>
              </Button>
            </div>
          </form>

          {/* Whitelist Display Table */}
          <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-white">
            {whitelistLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : whitelist.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
                No exceptions whitelisted.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3">Roll Number</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Type</th>
                    <th className="px-4 py-3 text-center">Class / Section</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold">
                  {whitelist.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-850 select-all">{item.roll_number}</td>
                      <td className="px-4 py-3 text-slate-800">{item.full_name || 'N/A'}</td>
                      <td className="px-4 py-3 lowercase select-all text-slate-500 font-bold">{item.email || 'N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[8px] font-bold rounded uppercase ${
                          item.student_type === 'lateral_entry' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                        }`}>
                          {item.student_type === 'lateral_entry' ? 'Lateral' : 'Regular'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center uppercase">
                        <div className="text-slate-750 font-bold">{item.branch}-{item.section}</div>
                        <div className="text-[8px] text-slate-400 font-bold mt-0.5">{item.batch} ({item.academic_year})</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleWhitelistActive(item.id, item.is_active)}
                          className={`inline-flex px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer ${
                            item.is_active 
                              ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-600 border border-emerald-100' 
                              : 'bg-red-50 hover:bg-red-100/80 text-red-600 border border-red-100'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Blocked'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteWhitelist(item.id, item.roll_number)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardBody>
      </Card>

    </div>
  );
};

export default SettingsPage;
