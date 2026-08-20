import React, { useEffect, useState, useRef } from 'react';
import { Card, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { supabase } from '../../lib/supabase';
import { 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  RefreshCw, 
  X, 
  CheckSquare,
  Square,
  Sparkles,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { authService } from '../../features/auth/authService';

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  roll_number?: string;
  branch: string;
  section: string;
  year: number;
  batch: string;
  oia_eligible: boolean;
  status: string;
}

interface ExcelImportRow {
  rowName: string;
  roll?: string;
  email?: string;
  matchId?: string;
  matchName?: string;
  matchRoll?: string;
  oiaEligible: boolean;
  status: 'matched' | 'unmatched';
}

export const Oia: React.FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedEligibility, setSelectedEligibility] = useState('ALL');

  // Filter lists
  const [branches, setBranches] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'enable' | 'disable' | null>(null);

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ExcelImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (error) throw error;

      const list: StudentProfile[] = (data || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        roll_number: p.roll_number,
        branch: p.branch || 'AIML',
        section: p.section || 'AIML-A',
        year: p.year || 3,
        batch: p.batch || '2023-2027',
        oia_eligible: p.oia_eligible || false,
        status: p.status || 'active'
      }));

      setStudents(list);

      // Extract filter options
      setBranches(Array.from(new Set(list.map(s => s.branch))).filter(Boolean));
      setSections(Array.from(new Set(list.map(s => s.section))).filter(Boolean));
      setBatches(Array.from(new Set(list.map(s => s.batch))).filter(Boolean));
    } catch (err: any) {
      console.error('[OIA_MGMT] Error loading students:', err);
      triggerToast('Failed to load student roster.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    
    // Subscribe to real-time changes on profiles
    const channel = supabase
      .channel('public:profiles_oia_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new && payload.new.role === 'student') {
            setStudents(current => 
              current.map(s => s.id === payload.new.id ? { ...s, oia_eligible: payload.new.oia_eligible } : s)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter evaluation
  const filteredStudents = students.filter(student => {
    const searchStr = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      student.full_name.toLowerCase().includes(searchStr) ||
      (student.roll_number || '').toLowerCase().includes(searchStr) ||
      student.email.toLowerCase().includes(searchStr);

    if (!matchesSearch) return false;

    if (selectedBranch !== 'ALL' && student.branch !== selectedBranch) return false;
    if (selectedSection !== 'ALL' && student.section !== selectedSection) return false;
    if (selectedYear !== 'ALL' && String(student.year) !== selectedYear) return false;
    if (selectedBatch !== 'ALL' && student.batch !== selectedBatch) return false;
    
    if (selectedEligibility !== 'ALL') {
      const isEligible = selectedEligibility === 'ELIGIBLE';
      if (student.oia_eligible !== isEligible) return false;
    }

    return true;
  });

  // Toggle OIA Access (Individual)
  const handleToggleOia = async (student: StudentProfile) => {
    try {
      setSubmitting(true);
      const targetVal = !student.oia_eligible;

      // Update Database via Service
      await authService.updateStudentOia(student.id, targetVal);

      // Log in Activity Audit Logs
      await supabase.from('admin_activity_logs').insert({
        actor_id: profile?.id,
        action: 'ADMIN_ROLE_CHANGED',
        details: {
          student_id: student.id,
          roll_number: student.roll_number,
          full_name: student.full_name,
          change_type: 'oia_eligibility',
          previous_value: student.oia_eligible,
          new_value: targetVal
        }
      });

      // Update Local State
      setStudents(curr => 
        curr.map(s => s.id === student.id ? { ...s, oia_eligible: targetVal } : s)
      );

      triggerToast(`OIA Access ${targetVal ? 'Enabled' : 'Disabled'} for ${student.full_name}.`);
    } catch (err: any) {
      console.error('[OIA_MGMT] Toggle failed:', err);
      triggerToast(err.message || 'Failed to update eligibility status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds(curr => {
      const copy = new Set(curr);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    setSelectedIds(new Set(filteredIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExecuteBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkConfirmAction) return;

    try {
      setSubmitting(true);
      const targetVal = bulkConfirmAction === 'enable';
      const selectedArray = Array.from(selectedIds);

      // Perform bulk database update
      const { error } = await supabase
        .from('profiles')
        .update({ 
          oia_eligible: targetVal,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedArray);

      if (error) throw error;

      // Verify the bulk updates by querying them back
      const { data: verified, error: verifyError } = await supabase
        .from('profiles')
        .select('id, oia_eligible')
        .in('id', selectedArray);

      if (verifyError) {
        throw new Error(`Verification of bulk updates failed: ${verifyError.message}`);
      }

      // Check if all verified students match targetVal
      const failedMatches = (verified || []).filter(s => s.oia_eligible !== targetVal);
      if (failedMatches.length > 0) {
        throw new Error(`Verification mismatch: ${failedMatches.length} profiles were not updated in database.`);
      }

      // Log activity
      await supabase.from('admin_activity_logs').insert({
        actor_id: profile?.id,
        action: 'ADMIN_ROLE_CHANGED',
        details: {
          change_type: 'bulk_oia_eligibility',
          student_count: selectedArray.length,
          action: targetVal ? 'enabled' : 'disabled',
          student_ids: selectedArray
        }
      });

      // Update Local State
      setStudents(curr => 
        curr.map(s => selectedIds.has(s.id) ? { ...s, oia_eligible: targetVal } : s)
      );

      triggerToast(`Successfully updated OIA Access for ${selectedArray.length} students.`);
      setSelectedIds(new Set());
      setBulkConfirmAction(null);
    } catch (err: any) {
      console.error('[OIA_MGMT] Bulk update failed:', err);
      triggerToast(err.message || 'Failed to perform bulk update.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Excel parsing logic
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);

        if (rawData.length === 0) {
          triggerToast('Uploaded file contains no rows.', 'error');
          return;
        }

        const results: ExcelImportRow[] = rawData.map((row: any) => {
          // Normalize row keys
          const normalized: Record<string, string> = {};
          Object.keys(row).forEach(k => {
            normalized[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = String(row[k] || '').trim();
          });

          // Match parameters
          const roll = normalized.rollnumber || normalized.roll || normalized.rollno || normalized.roll_no;
          const emailAddr = normalized.email || normalized.mail || normalized.emailaddress;
          const name = normalized.fullname || normalized.name || normalized.studentname;
          const oiaValueStr = normalized.oiaeligible || normalized.oia || normalized.eligible;

          // Find matches in student roster
          const match = students.find(s => 
            (roll && s.roll_number?.toLowerCase() === roll.toLowerCase()) ||
            (emailAddr && s.email.toLowerCase() === emailAddr.toLowerCase())
          );

          let oiaVal = true;
          if (oiaValueStr) {
            const ev = oiaValueStr.toLowerCase();
            if (ev === 'false' || ev === 'no' || ev === '0' || ev === 'disabled' || ev === 'off') {
              oiaVal = false;
            }
          }

          return {
            rowName: name || roll || emailAddr || 'Unknown Name',
            roll,
            email: emailAddr,
            matchId: match?.id,
            matchName: match?.full_name,
            matchRoll: match?.roll_number,
            oiaEligible: oiaVal,
            status: match ? 'matched' : 'unmatched'
          };
        });

        setImportPreview(results);
        setIsImportModalOpen(true);
      } catch (err: any) {
        console.error('[OIA_MGMT] Excel parse error:', err);
        triggerToast('Failed to parse Excel sheet. Ensure formatting is standard.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    const matchedRows = importPreview.filter(r => r.status === 'matched' && r.matchId);
    if (matchedRows.length === 0) {
      setIsImportModalOpen(false);
      triggerToast('No matched student profiles to update.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Separate into enable list and disable list
      const enableIds = matchedRows.filter(r => r.oiaEligible).map(r => r.matchId!);
      const disableIds = matchedRows.filter(r => !r.oiaEligible).map(r => r.matchId!);

      if (enableIds.length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update({ oia_eligible: true })
          .in('id', enableIds);
        if (error) throw error;
      }

      if (disableIds.length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update({ oia_eligible: false })
          .in('id', disableIds);
        if (error) throw error;
      }

      // Log bulk import action
      await supabase.from('admin_activity_logs').insert({
        actor_id: profile?.id,
        action: 'ADMIN_ROLE_CHANGED',
        details: {
          change_type: 'excel_oia_import',
          total_updated: matchedRows.length,
          enabled_count: enableIds.length,
          disabled_count: disableIds.length
        }
      });

      triggerToast(`Import complete. Updated OIA eligibility for ${matchedRows.length} students.`);
      loadStudents();
      setIsImportModalOpen(false);
      setImportPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('[OIA_MGMT] Import execute failed:', err);
      triggerToast('Error updating database from Excel import.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalOiaEligible = students.filter(s => s.oia_eligible).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200 ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}

      {/* Header section with Stats */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
              OIA Eligibility Board
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Manage student access authorization settings for Office of Industry Alliances (OIA).
          </p>
        </div>

        {/* Excel Import button */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border-slate-350 bg-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-650" />
            <span>Excel Sheet Import</span>
          </Button>

          <Button
            variant="outline"
            onClick={loadStudents}
            className="h-9 w-9 rounded-xl p-0 flex items-center justify-center border-slate-350 bg-white"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-450 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80 shadow-sm">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center text-primary border border-primary/10">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Total Students</span>
              <span className="text-lg font-black text-slate-850">{students.length}</span>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">OIA Authorized</span>
              <span className="text-lg font-black text-slate-850">{totalOiaEligible}</span>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Percent Eligible</span>
              <span className="text-lg font-black text-slate-850">
                {students.length > 0 ? Math.round((totalOiaEligible / students.length) * 100) : 0}%
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filter panel */}
      <Card className="border border-slate-200/80 shadow-sm">
        <CardBody className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <SearchBar
                onSearchChange={setSearchQuery}
                placeholder="Search student name, roll number, or email..."
              />
            </div>
            <div className="text-[10px] text-slate-405 font-black uppercase tracking-wider shrink-0">
              {filteredStudents.length} Students Listed
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
            {/* Branch */}
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Branch</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
              >
                <option value="ALL">All Branches</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Section</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
              >
                <option value="ALL">All Sections</option>
                {sections.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Academic Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
              >
                <option value="ALL">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            {/* Batch */}
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Batch</span>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
              >
                <option value="ALL">All Batches</option>
                {batches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* OIA Eligibility */}
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl col-span-2 sm:col-span-1">
              <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">OIA Eligible</span>
              <select
                value={selectedEligibility}
                onChange={(e) => setSelectedEligibility(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-650 focus:outline-none w-full uppercase"
              >
                <option value="ALL">All Status</option>
                <option value="ELIGIBLE">OIA Eligible</option>
                <option value="INELIGIBLE">Ineligible</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Bulk actions ribbon (only shown when items selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-in slide-in-from-bottom-6 duration-200 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-white/10 rounded-xl flex items-center justify-center font-black text-xs text-[#D9B310] border border-white/5">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Students Selected</p>
              <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">Select bulk operation to update OIA permission status</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleDeselectAll}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-300 hover:text-white border-white/15 bg-transparent hover:bg-white/5"
            >
              Clear
            </Button>
            <Button
              variant="success"
              onClick={() => setBulkConfirmAction('enable')}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 border-transparent text-white"
            >
              Enable OIA Access
            </Button>
            <Button
              variant="danger"
              onClick={() => setBulkConfirmAction('disable')}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider bg-red-650 hover:bg-red-550 border-transparent text-white"
            >
              Disable OIA Access
            </Button>
          </div>
        </div>
      )}

      {/* Main Roster Panel */}
      <Card className="border border-slate-200/80 shadow-sm overflow-hidden bg-white">
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center p-16 text-slate-400">
              <AlertCircle className="h-8 w-8 mx-auto opacity-45 mb-2" />
              <p className="text-xs font-black uppercase tracking-wider">No matching students found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Roster Grid */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4.5 w-12 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIds.size === filteredStudents.length) {
                              handleDeselectAll();
                            } else {
                              handleSelectAllFiltered();
                            }
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {selectedIds.size === filteredStudents.length ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4.5">Student Details</th>
                      <th className="px-6 py-4.5">Email ID</th>
                      <th className="px-6 py-4.5 text-center">Branch / Batch</th>
                      <th className="px-6 py-4.5 text-center">OIA State</th>
                      <th className="px-6 py-4.5 text-center">Toggle Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 select-text font-medium text-slate-700">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedIds.has(student.id);
                      return (
                        <tr key={student.id} className={`hover:bg-slate-50/40 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                          <td className="px-6 py-4.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(student.id)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4.5">
                            <div className="font-bold text-slate-800 leading-snug">{student.full_name}</div>
                            <span className="text-[10px] text-slate-450 font-bold block mt-0.5">{student.roll_number || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4.5 select-all text-slate-500 font-bold">{student.email}</td>
                          <td className="px-6 py-4.5 text-center uppercase">
                            <div className="font-semibold text-slate-655">{student.branch}-{student.section}</div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">{student.batch} (Year {student.year})</span>
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            <Badge variant={student.oia_eligible ? 'success' : 'neutral'} className="text-[8px] font-black tracking-widest uppercase">
                              {student.oia_eligible ? 'Access ON' : 'Access OFF'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleToggleOia(student)}
                              className={`h-7 w-20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none border border-transparent shadow-sm ${
                                student.oia_eligible
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-205'
                              }`}
                            >
                              {student.oia_eligible ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Roster Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  return (
                    <div key={student.id} className={`p-4 space-y-3 relative ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(student.id)}
                            className="text-slate-450 mt-0.5"
                          >
                            {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                          </button>
                          <div>
                            <h4 className="font-bold text-slate-850 text-xs leading-none">{student.full_name}</h4>
                            <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-1 block">{student.roll_number || 'N/A'}</span>
                          </div>
                        </div>
                        <Badge variant={student.oia_eligible ? 'success' : 'neutral'} className="text-[8px] font-bold tracking-wider uppercase">
                          {student.oia_eligible ? 'OIA ON' : 'OIA OFF'}
                        </Badge>
                      </div>

                      <div className="text-[10px] text-slate-500 space-y-0.5 select-text pl-6">
                        <div>Email: <span className="font-bold text-slate-700">{student.email}</span></div>
                        <div className="uppercase">Class: <span className="font-bold text-slate-700">{student.branch}-{student.section} ({student.batch})</span></div>
                      </div>

                      <div className="pl-6 flex justify-end">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleToggleOia(student)}
                          className={`h-7 px-4 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none border border-transparent shadow-sm ${
                            student.oia_eligible
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-150 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-205'
                          }`}
                        >
                          {student.oia_eligible ? 'Turn Off Access' : 'Turn On Access'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Confirmation Dialog for Bulk Actions */}
      {bulkConfirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setBulkConfirmAction(null)} />
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 z-10 space-y-4">
            <div className="mx-auto h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-black text-slate-800 uppercase leading-none">Confirm Bulk Changes</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                You are modifying permissions for {selectedIds.size} student(s)
              </p>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed text-center">
              Are you sure you want to {bulkConfirmAction === 'enable' ? 'enable' : 'disable'} OIA access permissions for the selected student records? This change will take effect immediately.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkConfirmAction(null)}
                className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteBulkAction}
                className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase text-white bg-primary"
              >
                Confirm Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Sheet Import Preview Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 z-10 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase">Excel Import Preview</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                  Confirm matched student profiles before applying changes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-655"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex-grow overflow-y-auto space-y-4">
              {/* Summary blocks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                  <span className="block text-[8px] font-black text-emerald-700 uppercase tracking-widest">Matched Records</span>
                  <span className="text-lg font-black text-emerald-800">{importPreview.filter(r => r.status === 'matched').length}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                  <span className="block text-[8px] font-black text-amber-700 uppercase tracking-widest">Unmatched (Skipped)</span>
                  <span className="text-lg font-black text-amber-800">{importPreview.filter(r => r.status === 'unmatched').length}</span>
                </div>
              </div>

              {/* Roster preview list */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">Import Rows</h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/50">
                  {importPreview.map((row, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{row.rowName}</span>
                          {row.status === 'matched' ? (
                            <Badge variant="success" className="text-[7px] font-bold px-1 py-0 shadow-none bg-emerald-100 text-emerald-800 uppercase tracking-wide border-transparent">
                              Matched
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[7px] font-bold px-1 py-0 shadow-none bg-amber-100 text-amber-850 uppercase tracking-wide border-transparent">
                              Unmatched
                            </Badge>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                          Roll: {row.roll || 'N/A'} • Email: {row.email || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="text-right flex items-center gap-2">
                        {row.status === 'matched' && (
                          <div className="text-[10px] text-slate-500 font-semibold">
                            Matched as: <span className="font-bold text-slate-700">{row.matchName} ({row.matchRoll})</span>
                          </div>
                        )}
                        <Badge variant={row.oiaEligible ? 'success' : 'neutral'} className="text-[8px] font-bold uppercase shrink-0">
                          {row.oiaEligible ? 'Access ON' : 'Access OFF'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-150 text-slate-500 text-[10px] font-semibold rounded-xl leading-normal">
                💡 **Matching Rule**: Profiles are matched automatically using their student Roll Number or official Anurag Email Address. Records marked as unmatched will not create new accounts and will be ignored.
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase bg-white border-slate-205"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase text-white bg-primary"
              >
                Apply Updates ({importPreview.filter(r => r.status === 'matched').length})
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Oia;
