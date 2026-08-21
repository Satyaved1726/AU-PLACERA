import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { SearchBar } from '../../components/common/SearchBar';
import { supabase } from '../../lib/supabase';
import { GraduationCap, AlertCircle } from 'lucide-react';

interface StudentRosterItem {
  id: string;
  full_name: string;
  email: string;
  roll_number?: string;
  branch: string;
  section: string;
  year: number;
  batch: string;
  oia_eligible: boolean;
  registrationCount: number;
}

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedOia, setSelectedOia] = useState('ALL');

  // Filter dropdown lists
  const [branches, setBranches] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch all students
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (profileErr) throw profileErr;

      // Fetch all registrations to group and count
      const { data: registrations, error: regErr } = await supabase
        .from('registrations')
        .select('student_id');

      if (regErr) throw regErr;

      // Count registrations per student
      const regCounts: Record<string, number> = {};
      (registrations || []).forEach(r => {
        regCounts[r.student_id] = (regCounts[r.student_id] || 0) + 1;
      });

      // Map profiles with registration count
      const items: StudentRosterItem[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        roll_number: p.roll_number,
        branch: p.branch || 'AIML',
        section: p.section || 'AIML-A',
        year: p.year || 3,
        batch: p.batch || '2023-2027',
        oia_eligible: p.oia_eligible || false,
        registrationCount: regCounts[p.id] || 0
      }));

      setStudents(items);

      // Extract unique list values for filter dropdown selections
      const uniqueBranches = Array.from(new Set(items.map(s => s.branch))).filter(Boolean);
      const uniqueSections = Array.from(new Set(items.map(s => s.section))).filter(Boolean);
      const uniqueBatches = Array.from(new Set(items.map(s => s.batch))).filter(Boolean);

      setBranches(uniqueBranches);
      setSections(uniqueSections);
      setBatches(uniqueBatches);
    } catch (err) {
      console.error('[STUDENTS] Failed to load student roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter evaluation logic
  const filteredStudents = students.filter(student => {
    // Search query matching
    const searchString = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      student.full_name.toLowerCase().includes(searchString) ||
      (student.roll_number || '').toLowerCase().includes(searchString) ||
      student.email.toLowerCase().includes(searchString);

    if (!matchesSearch) return false;

    // Category matching
    if (selectedBranch !== 'ALL' && student.branch !== selectedBranch) return false;
    if (selectedSection !== 'ALL' && student.section !== selectedSection) return false;
    if (selectedBatch !== 'ALL' && student.batch !== selectedBatch) return false;
    if (selectedOia !== 'ALL') {
      const isEligible = selectedOia === 'ELIGIBLE';
      if (student.oia_eligible !== isEligible) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
        <GraduationCap className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
            Student Roster
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            View student credentials, batch metadata, and placement enrollment applications.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border border-slate-200/80 shadow-sm">
        <CardBody className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <SearchBar
                onSearchChange={setSearchQuery}
                placeholder="Search name, roll number, or email..."
              />
            </div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider shrink-0">
              {filteredStudents.length} Students Matching
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
                value={selectedOia}
                onChange={(e) => setSelectedOia(e.target.value)}
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

      {/* Roster Cards List */}
      <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <AlertCircle className="h-8 w-8 mx-auto opacity-55 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider">No matching students found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Roster Grid */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4.5">Roll Number / Name</th>
                      <th className="px-6 py-4.5">Email</th>
                      <th className="px-6 py-4.5 text-center">Batch / Class</th>
                      <th className="px-6 py-4.5 text-center">OIA State</th>
                      <th className="px-6 py-4.5 text-center">Applications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 select-text font-medium text-slate-700">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4.5">
                          <div className="font-bold text-slate-800">{student.full_name}</div>
                          <span className="text-[10px] text-slate-450 font-bold block mt-0.5">{student.roll_number || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4.5 select-all text-slate-500 font-bold">{student.email}</td>
                        <td className="px-6 py-4.5 text-center uppercase">
                          <div className="font-semibold text-slate-650">{student.branch}-{student.section}</div>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{student.batch} (Year {student.year})</span>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <Badge variant={student.oia_eligible ? 'success' : 'neutral'} className="text-[8px] font-bold tracking-widest uppercase">
                            {student.oia_eligible ? 'Eligible' : 'Ineligible'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4.5 text-center font-black text-slate-800 text-xs">
                          {student.registrationCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Roster Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{student.full_name}</h4>
                        <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-0.5 block">{student.roll_number || 'N/A'}</span>
                      </div>
                      <Badge variant={student.oia_eligible ? 'success' : 'neutral'} className="text-[8px] font-bold tracking-wider uppercase">
                        {student.oia_eligible ? 'Eligible' : 'Ineligible'}
                      </Badge>
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-1 select-text">
                      <div>Email: <span className="font-bold text-slate-700">{student.email}</span></div>
                      <div className="uppercase">Class: <span className="font-bold text-slate-700">{student.branch}-{student.section} ({student.batch})</span></div>
                      <div>Applications: <span className="font-black text-slate-800">{student.registrationCount}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>

    </div>
  );
};

export default StudentsPage;
