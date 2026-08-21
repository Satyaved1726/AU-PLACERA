import React, { useState } from 'react';
import { useRegistrations } from '../hooks/useRegistrations';
import { X, Search, AlertCircle, Users, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Post, Registration } from '../../../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RegistrationListDialogProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RegistrationListDialog: React.FC<RegistrationListDialogProps> = ({
  post,
  isOpen,
  onClose
}) => {
  const postId = post?.id || '';
  const postTitle = post?.company_name
    ? `${post.company_name} — ${post.opportunity_title}`
    : (post?.opportunity_title || 'Untitled Notice');

  const { data: registrations = [], isLoading, error } = useRegistrations(postId);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [exportOpen, setExportOpen] = useState(false);

  if (!isOpen || !post) return null;


  // Dynamic section counts map
  const sectionCounts: { [key: string]: number } = {};
  registrations.forEach(reg => {
    const sec = reg.section || 'Unassigned';
    sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
  });

  // Sort sections alphabetically, keeping 'Unassigned' at the end
  const sortedSections = Object.keys(sectionCounts).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  // Helper to trigger file download in browser
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV Export Logic
  const handleExportCsv = (dataset: Registration[], isFiltered: boolean) => {
    const escapeCsvCell = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const headers = [
      'S.No',
      'Student Name',
      'Roll Number',
      'Official Email',
      'Phone',
      'Department',
      'Branch/Specialization',
      'Section',
      'Academic Year',
      'Batch',
      'Registration Date & Time'
    ];

    const rows = dataset.map((reg, index) => [
      escapeCsvCell(index + 1),
      escapeCsvCell(reg.student_name),
      escapeCsvCell(reg.roll_number),
      escapeCsvCell(reg.email),
      escapeCsvCell(reg.phone),
      escapeCsvCell(reg.department),
      escapeCsvCell(reg.branch),
      escapeCsvCell(reg.section),
      escapeCsvCell(reg.year ? `Year ${reg.year}` : 'N/A'),
      escapeCsvCell(reg.batch),
      escapeCsvCell(reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A')
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const cleanedTitle = postTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filterSuffix = isFiltered ? '_filtered' : '';
    triggerDownload(blob, `registrations_${cleanedTitle}${filterSuffix}.csv`);
  };

  // Excel Export Logic
  const handleExportExcel = (dataset: Registration[], isFiltered: boolean) => {
    const wb = XLSX.utils.book_new();

    const localSectionCounts: { [key: string]: number } = {};
    dataset.forEach(reg => {
      const sec = reg.section || 'Unassigned';
      localSectionCounts[sec] = (localSectionCounts[sec] || 0) + 1;
    });

    const summaryRows = [
      [' Anurag University - Placements Portal Registration Summary'],
      [],
      ['Post Title', postTitle],
      ['Post Type', post.post_type.toUpperCase()],
      ['Audience', post.audience === 'oia' ? 'OIA Students Only' : 'General (All Students)'],
      ['Posted Date', new Date(post.created_at).toLocaleString()],
      ['Export Date & Time', new Date().toLocaleString()],
      ['Dataset Type', isFiltered ? 'Filtered Results Only' : 'Complete Registration List'],
      [],
      ['Section Breakdown', 'Registered Students Count'],
    ];

    Object.keys(localSectionCounts).sort().forEach(sec => {
      summaryRows.push([sec, String(localSectionCounts[sec])]);
    });

    summaryRows.push([]);
    summaryRows.push(['Grand Total', String(dataset.length)]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const grouped: { [key: string]: Registration[] } = {};
    dataset.forEach(reg => {
      const sec = reg.section || 'Unassigned';
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push(reg);
    });

    Object.keys(grouped).sort().forEach(sec => {
      const secData = grouped[sec];
      const sheetRows = [
        [
          'S.No',
          'Student Name',
          'Roll Number',
          'Official Email',
          'Phone',
          'Department',
          'Branch/Specialization',
          'Section',
          'Academic Year',
          'Batch',
          'Registration Date & Time'
        ]
      ];

      secData.forEach((reg, index) => {
        sheetRows.push([
          String(index + 1),
          reg.student_name || 'N/A',
          reg.roll_number || 'N/A',
          reg.email || 'N/A',
          reg.phone || 'N/A',
          reg.department || 'N/A',
          reg.branch || 'N/A',
          reg.section || 'N/A',
          reg.year ? `Year ${reg.year}` : 'N/A',
          reg.batch || 'N/A',
          reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A'
        ]);
      });

      const wsSection = XLSX.utils.aoa_to_sheet(sheetRows);
      const colWidths = sheetRows[0].map((_, colIndex) => {
        let maxLen = 0;
        sheetRows.forEach(row => {
          const val = row[colIndex] || '';
          maxLen = Math.max(maxLen, val.length);
        });
        return { wch: maxLen + 3 };
      });
      wsSection['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsSection, sec.slice(0, 31));
    });

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const cleanedTitle = postTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filterSuffix = isFiltered ? '_filtered' : '';
    triggerDownload(blob, `registrations_${cleanedTitle}${filterSuffix}.xlsx`);
  };

  // PDF Export Logic
  const handleExportPdf = (dataset: Registration[], isFiltered: boolean) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const localSectionCounts: { [key: string]: number } = {};
    dataset.forEach(reg => {
      const sec = reg.section || 'Unassigned';
      localSectionCounts[sec] = (localSectionCounts[sec] || 0) + 1;
    });

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ANURAG UNIVERSITY - PLACEMENTS PORTAL', 15, 13);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(`EXPORT DATE: ${new Date().toLocaleString()}`, 240, 13);

    doc.setTextColor(51, 65, 85);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('POST DETAILS', 15, 30);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 32, 282, 32);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Title: ${postTitle}`, 15, 38);
    doc.text(`Type: ${post.post_type.toUpperCase()}`, 15, 43);
    doc.text(`Audience: ${post.audience === 'oia' ? 'OIA Students Only' : 'General (All Students)'}`, 120, 38);
    doc.text(`Posted Date: ${new Date(post.created_at).toLocaleString()}`, 120, 43);
    doc.text(`Record Scope: ${isFiltered ? 'Filtered Results Only' : 'Complete Registrations list'}`, 220, 38);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SECTION-WISE SUMMARY', 15, 53);
    doc.line(15, 55, 282, 55);

    const breakdownHeaders = ['Section', 'Student Count'];
    const breakdownRows = Object.keys(localSectionCounts).sort().map(sec => [
      sec,
      String(localSectionCounts[sec])
    ]);
    breakdownRows.push(['Grand Total', String(dataset.length)]);

    autoTable(doc, {
      startY: 58,
      head: [breakdownHeaders],
      body: breakdownRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
      headStyles: { fillColor: [71, 85, 105], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 30 }
      },
      margin: { left: 15 }
    });

    doc.addPage();
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Registration Roster: ${postTitle}`, 15, 8);

    const rosterHeaders = [
      'S.No',
      'Student Name',
      'Roll Number',
      'Email',
      'Phone',
      'Dept',
      'Specialization',
      'Sec',
      'Year',
      'Batch',
      'Registered At'
    ];

    const rosterRows = dataset.map((reg, index) => [
      String(index + 1),
      reg.student_name || 'N/A',
      reg.roll_number || 'N/A',
      reg.email || 'N/A',
      reg.phone || 'N/A',
      reg.department || 'N/A',
      reg.branch || 'N/A',
      reg.section || 'N/A',
      reg.year ? `Y ${reg.year}` : 'N/A',
      reg.batch || 'N/A',
      reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: 18,
      head: [rosterHeaders],
      body: rosterRows,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 40 },
        7: { cellWidth: 15, halign: 'center' },
        8: { cellWidth: 12, halign: 'center' },
        9: { cellWidth: 15, halign: 'center' },
        10: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 15, right: 15 },
      didDrawPage: () => {
        const str = `Page ${doc.getNumberOfPages()}`;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, 282, 203, { align: 'right' });
      }
    });

    const cleanedTitle = postTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filterSuffix = isFiltered ? '_filtered' : '';
    doc.save(`registrations_${cleanedTitle}${filterSuffix}.pdf`);
  };


  // Filter registrations list
  const filtered = registrations.filter(reg => {
    const searchString = (
      (reg.student_name || '') + ' ' +
      (reg.roll_number || '')
    ).toLowerCase();

    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesSection = sectionFilter === 'all' || reg.section === sectionFilter;
    const matchesYear = yearFilter === 'all' || String(reg.year) === yearFilter;

    return matchesSearch && matchesSection && matchesYear;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 select-none">
        
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
        />

        {/* Modal Sheet Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full md:max-w-3xl bg-white rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 max-h-[85vh] md:max-h-[90vh] flex flex-col pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-0"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Registration Logs
              </span>
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight mt-0.5 truncate max-w-[200px] sm:max-w-md">
                {postTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-10 w-10 flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filters Segment */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input bar */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-secondary text-xs font-semibold bg-white"
              />
            </div>

            {/* Section/Year dropdown pills */}
            <div className="flex items-center gap-2 select-none">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-500 focus:outline-none"
              >
                <option value="all">All Sections</option>
                <option value="AIML-A">Section A</option>
                <option value="AIML-B">Section B</option>
                <option value="AIML-C">Section C</option>
                <option value="AIML-D">Section D</option>
                <option value="AIML-E">Section E</option>
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-500 focus:outline-none"
              >
                <option value="all">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          {/* Dynamic Section Breakdowns Renders */}
          {!isLoading && !error && registrations.length > 0 && (
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <div className="bg-white border border-slate-200/80 p-2 rounded-xl text-center shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Grand Total</span>
                <span className="text-xs font-black text-slate-800 mt-0.5 block">{registrations.length}</span>
              </div>
              {sortedSections.map(sec => (
                <div key={sec} className="bg-white border border-slate-200/80 p-2 rounded-xl text-center shadow-sm">
                  <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest block truncate" title={sec}>
                    {sec}
                  </span>
                  <span className="text-xs font-black text-slate-700 mt-0.5 block">{sectionCounts[sec]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mobile Export Action Trigger */}
          {!isLoading && !error && registrations.length > 0 && (
            <div className="md:hidden px-4 py-2.5 border-b border-slate-100 bg-slate-50 select-none">
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="w-full h-10 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all"
              >
                <FileDown className="h-4 w-4" />
                <span>Export Registration Logs</span>
              </button>
            </div>
          )}

          {/* Desktop Export Ribbon Actions */}
          {!isLoading && !error && registrations.length > 0 && (
            <div className="hidden md:flex px-6 py-3.5 bg-slate-50 border-b border-slate-100 justify-center items-center select-none">
              <div className="space-y-2 w-full max-w-md text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Export Registration Logs ({filtered.length})
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleExportExcel(filtered, true)}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1 shadow-sm font-sans"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExportCsv(filtered, true)}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1 shadow-sm font-sans"
                  >
                    CSV (.csv)
                  </button>
                  <button
                    onClick={() => handleExportPdf(filtered, true)}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1 shadow-sm font-sans"
                  >
                    PDF (.pdf)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Database Output Scroll Container */}
          <div className="flex-grow overflow-y-auto p-4 select-none">
            {/* LOADING STATE */}
            {isLoading && (
              <div className="space-y-3 py-8 text-center">
                <div className="h-4 w-12 bg-slate-200 rounded mx-auto animate-pulse" />
                <span className="text-xs text-slate-400 font-semibold animate-pulse block">Retrieving Registrations...</span>
              </div>
            )}

            {/* ERROR STATE */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-150 rounded-xl text-red-700 text-xs flex items-start gap-2.5 max-w-md mx-auto my-8">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>Failed to query registration logs. Verify security access tokens.</span>
              </div>
            )}

            {/* EMPTY LIST STATE */}
            {!isLoading && !error && filtered.length === 0 && (
              <div className="text-center py-12">
                <div className="p-2.5 bg-slate-100 rounded-full inline-block text-slate-400 mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">No matching logs</h4>
                <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-1 leading-normal">
                  No registered student records match the chosen search parameters.
                </p>
              </div>
            )}

            {/* LIST GRIDS */}
            {!isLoading && !error && filtered.length > 0 && (
              <>
                {/* 1. MOBILE CARDS VIEW (md:hidden) */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filtered.map(reg => (
                    <div 
                      key={reg.id}
                      className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2 text-xs font-semibold"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-800">{reg.student_name}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Roll: {reg.roll_number}</span>
                        </div>
                        <Badge variant="neutral" className="bg-slate-200 border-transparent text-[8px] tracking-wide uppercase px-1 py-0.5 text-slate-600">
                          {reg.section || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-bold">
                        <span>Year: {reg.year || 'N/A'}</span>
                        <span>Reg: {new Date(reg.registered_at).toLocaleDateString(undefined, { dateStyle: 'short' })}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. DESKTOP LIST VIEW (md:block hidden) */}
                <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="px-5 py-3">Student Name</th>
                        <th className="px-5 py-3">Roll Number</th>
                        <th className="px-5 py-3">Section</th>
                        <th className="px-5 py-3 text-center">Year</th>
                        <th className="px-5 py-3 text-right">Registered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(reg => (
                        <tr key={reg.id} className="hover:bg-slate-50/20 font-semibold text-slate-700">
                          <td className="px-5 py-2.5 font-bold text-slate-800">{reg.student_name}</td>
                          <td className="px-5 py-2.5 font-mono text-slate-500">{reg.roll_number}</td>
                          <td className="px-5 py-2.5 text-slate-600">{reg.section || 'N/A'}</td>
                          <td className="px-5 py-2.5 text-center text-slate-500">{reg.year || 'N/A'}</td>
                          <td className="px-5 py-2.5 text-right text-[10px] text-slate-400 font-bold">
                            {new Date(reg.registered_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Dialog Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              onClick={onClose}
              className="h-10 px-5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
            >
              Close List
            </button>
          </div>

        </motion.div>
      </div>

      {/* Export Bottom Sheet Drawer */}
      <AnimatePresence>
        {exportOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setExportOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Slide up panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl p-6 pb-[calc(24px+env(safe-area-inset-bottom))] space-y-5 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 tracking-wider uppercase">Export Registrations</span>
                <button
                  onClick={() => setExportOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center">Export Data ({filtered.length} items)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => { handleExportExcel(filtered, true); setExportOpen(false); }}
                      className="py-2.5 px-1 bg-emerald-600 hover:bg-emerald-705 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                    >
                      Excel
                    </button>
                    <button
                      onClick={() => { handleExportCsv(filtered, true); setExportOpen(false); }}
                      className="py-2.5 px-1 bg-blue-600 hover:bg-blue-705 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => { handleExportPdf(filtered, true); setExportOpen(false); }}
                      className="py-2.5 px-1 bg-red-600 hover:bg-red-705 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

// Helper badge component
const Badge: React.FC<{ children: React.ReactNode; variant?: string; className?: string }> = ({
  children,
  className = ''
}) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${className}`}>
    {children}
  </span>
);
