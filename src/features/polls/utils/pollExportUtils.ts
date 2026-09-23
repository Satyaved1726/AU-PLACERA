import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PollAnalyticsSummary } from '../../../types';

/**
 * Helper to trigger browser file download
 */
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

export const cleanFileName = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
    .replace(/^_|_$/g, '');
};

export const getCleanSectionLetter = (sectionStr?: string): string => {
  if (!sectionStr) return '';
  return sectionStr.replace(/^AIML-/i, '').replace(/^Section\s+/i, '').trim().toUpperCase();
};

/**
 * Natural sort for student rows: by Section ascending, then Roll Number ascending
 */
export const naturalSortStudents = <T extends { section?: string; raw_section?: string; roll_number?: string }>(students: T[]): T[] => {
  return [...students].sort((a, b) => {
    const secA = getCleanSectionLetter(a.raw_section || a.section);
    const secB = getCleanSectionLetter(b.raw_section || b.section);
    const secComp = secA.localeCompare(secB, undefined, { numeric: true, sensitivity: 'base' });
    if (secComp !== 0) return secComp;
    return (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' });
  });
};

/**
 * Natural sort for students within a single section: by Roll Number ascending
 */
export const sectionSortStudents = <T extends { roll_number?: string }>(students: T[]): T[] => {
  return [...students].sort((a, b) => {
    return (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' });
  });
};

/**
 * Dedicated Multi-sheet Excel export for Not Responded Students:
 * Sheets: Overall, Section A, Section B, Section C, Section D, Section E, Section F
 */
export const exportNotRespondedToExcel = (analytics: PollAnalyticsSummary) => {
  const { poll, total_students, students_voted, not_responded, section_breakdown, non_responders } = analytics;
  const wb = XLSX.utils.book_new();

  // --------------------------------------------------------------------------
  // SHEET 1: Overall (All Not Responded Students)
  // --------------------------------------------------------------------------
  const overallRows: any[][] = [
    ['POLL:', poll.question],
    [],
    ['TOTAL ELIGIBLE STUDENTS:', total_students],
    ['RESPONDED:', students_voted],
    ['NOT RESPONDED:', not_responded],
    [],
    ['S.No', 'Roll Number', 'Student Name', 'Section', 'Branch', 'Year', 'Batch', 'Status']
  ];

  const sortedOverall = naturalSortStudents(non_responders);

  sortedOverall.forEach((nr, idx) => {
    const secLetter = getCleanSectionLetter(nr.raw_section || nr.section) || nr.section;
    overallRows.push([
      idx + 1,
      nr.roll_number,
      nr.student_name,
      secLetter,
      nr.branch || 'AIML',
      nr.year ?? 3,
      nr.batch || '2023-2027',
      'Not Responded'
    ]);
  });

  const wsOverall = XLSX.utils.aoa_to_sheet(overallRows);
  wsOverall['!cols'] = [
    { wch: 8 },   // S.No
    { wch: 18 },  // Roll Number
    { wch: 32 },  // Student Name
    { wch: 12 },  // Section
    { wch: 12 },  // Branch
    { wch: 10 },  // Year
    { wch: 16 },  // Batch
    { wch: 18 }   // Status
  ];

  const overallTotalRows = overallRows.length;
  wsOverall['!autofilter'] = { ref: `A7:H${Math.max(7, overallTotalRows)}` };
  wsOverall['!views'] = [{ state: 'frozen', ySplit: 7, xSplit: 0, activePane: 'bottomLeft' }];
  XLSX.utils.book_append_sheet(wb, wsOverall, 'Overall');

  // --------------------------------------------------------------------------
  // SECTIONS A through F (Section-wise Sheets)
  // --------------------------------------------------------------------------
  // We determine all sections from section_breakdown or fallback to A-F
  const sectionsToExport = section_breakdown.length > 0
    ? section_breakdown
    : ['A', 'B', 'C', 'D', 'E', 'F'].map(letter => ({
        section: `AIML-${letter}`,
        display_section: `Section ${letter}`,
        option_counts: {},
        students_voted: 0,
        eligible_students: 0,
        response_rate: 0
      }));

  sectionsToExport.forEach(sec => {
    const secLetter = getCleanSectionLetter(sec.section || sec.display_section);
    const sheetName = `Section ${secLetter}`;

    // Filter non-responders strictly belonging to this section
    const secNonResponders = non_responders.filter(nr => {
      const nrSecLetter = getCleanSectionLetter(nr.raw_section || nr.section);
      return nrSecLetter === secLetter;
    });

    const sortedSecStudents = sectionSortStudents(secNonResponders);
    const secNotResponded = Math.max(0, sec.eligible_students - sec.students_voted);

    const secRows: any[][] = [
      ['POLL:', poll.question],
      ['SECTION:', secLetter],
      [],
      ['TOTAL ELIGIBLE STUDENTS:', sec.eligible_students],
      ['RESPONDED:', sec.students_voted],
      ['NOT RESPONDED:', secNotResponded],
      [],
      ['S.No', 'Roll Number', 'Student Name', 'Branch', 'Year', 'Batch', 'Status']
    ];

    sortedSecStudents.forEach((nr, idx) => {
      secRows.push([
        idx + 1,
        nr.roll_number,
        nr.student_name,
        nr.branch || 'AIML',
        nr.year ?? 3,
        nr.batch || '2023-2027',
        'Not Responded'
      ]);
    });

    const wsSec = XLSX.utils.aoa_to_sheet(secRows);
    wsSec['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 18 },  // Roll Number
      { wch: 32 },  // Student Name
      { wch: 12 },  // Branch
      { wch: 10 },  // Year
      { wch: 16 },  // Batch
      { wch: 18 }   // Status
    ];

    const secTotalRows = secRows.length;
    wsSec['!autofilter'] = { ref: `A8:G${Math.max(8, secTotalRows)}` };
    wsSec['!views'] = [{ state: 'frozen', ySplit: 8, xSplit: 0, activePane: 'bottomLeft' }];
    XLSX.utils.book_append_sheet(wb, wsSec, sheetName);
  });

  // Write and trigger download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const fileName = `AU_Placera_Not_Responded_${cleanFileName(poll.question)}.xlsx`;
  triggerDownload(blob, fileName);
};

/**
 * Multi-sheet Excel export for Full WhatsApp-Style Poll Analytics
 */
export const exportPollToExcel = (analytics: PollAnalyticsSummary) => {
  const { poll, total_students, students_voted, not_responded, response_rate, option_breakdown, section_breakdown, student_responses, non_responders } = analytics;
  const wb = XLSX.utils.book_new();

  // --------------------------------------------------------------------------
  // SHEET 1: Poll Summary
  // --------------------------------------------------------------------------
  const summaryData = [
    ['AU PLACERA — STUDENT POLL SUMMARY REPORT'],
    [],
    ['Poll Question', poll.question],
    ['Created Date', new Date(poll.created_at).toLocaleString()],
    ['Poll Type', poll.allow_multiple_answers ? 'Multiple Answers' : 'Single Answer'],
    ['Multiple Answers Allowed', poll.allow_multiple_answers ? 'Yes' : 'No'],
    [],
    ['OVERALL METRICS'],
    ['Total Students', total_students],
    ['Students Voted', students_voted],
    ['Not Responded', not_responded],
    ['Response Rate', `${response_rate}%`],
    [],
    ['Report Generated', new Date().toLocaleString()]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Poll Summary');

  // --------------------------------------------------------------------------
  // SHEET 2: Overall Results
  // --------------------------------------------------------------------------
  const overallRows: any[][] = [
    ['Option', 'Students Selected', 'Percentage (%)']
  ];

  option_breakdown.forEach(opt => {
    overallRows.push([opt.option_text, opt.votes, `${opt.percentage}%`]);
  });

  const wsOverall = XLSX.utils.aoa_to_sheet(overallRows);
  wsOverall['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsOverall, 'Overall Results');

  // --------------------------------------------------------------------------
  // SHEET 3: Section-wise Results (Dynamic Columns based on Poll Options)
  // --------------------------------------------------------------------------
  const sectionHeaders = ['Section'];
  poll.options.forEach(opt => {
    sectionHeaders.push(opt.option_text);
  });
  sectionHeaders.push('Students Voted', 'Eligible Students', 'Response Rate (%)');

  const sectionRows: any[][] = [sectionHeaders];

  section_breakdown.forEach(sec => {
    const row: any[] = [sec.display_section];
    poll.options.forEach(opt => {
      row.push(sec.option_counts[opt.id] || 0);
    });
    row.push(sec.students_voted, sec.eligible_students, `${sec.response_rate}%`);
    sectionRows.push(row);
  });

  const wsSection = XLSX.utils.aoa_to_sheet(sectionRows);
  wsSection['!cols'] = sectionHeaders.map((h, i) => ({ wch: Math.max(h.length + 3, i === 0 ? 16 : 14) }));
  XLSX.utils.book_append_sheet(wb, wsSection, 'Section-wise Results');

  // --------------------------------------------------------------------------
  // SHEET 4: Student Responses
  // --------------------------------------------------------------------------
  const studentRows: any[][] = [
    ['S.No', 'Roll Number', 'Student Name', 'Section', 'Branch', 'Year', 'Batch', 'Selected Answer(s)', 'Voted At']
  ];

  const sortedStudentResponses = naturalSortStudents(student_responses);

  sortedStudentResponses.forEach((resp, idx) => {
    studentRows.push([
      idx + 1,
      resp.roll_number,
      resp.student_name,
      getCleanSectionLetter(resp.raw_section || resp.section) || resp.section,
      resp.branch || 'AIML',
      resp.year ?? 3,
      resp.batch || '2023-2027',
      resp.selected_options.join(', '),
      new Date(resp.voted_at).toLocaleString()
    ]);
  });

  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  wsStudents['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 35 },
    { wch: 25 }
  ];
  wsStudents['!autofilter'] = { ref: `A1:I${Math.max(1, studentRows.length)}` };
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Student Responses');

  // --------------------------------------------------------------------------
  // SHEET 5: Not Responded
  // --------------------------------------------------------------------------
  const nonResponderRows: any[][] = [
    ['S.No', 'Roll Number', 'Student Name', 'Section', 'Branch', 'Year', 'Batch', 'Status']
  ];

  const sortedNonResponders = naturalSortStudents(non_responders);

  sortedNonResponders.forEach((nr, idx) => {
    nonResponderRows.push([
      idx + 1,
      nr.roll_number,
      nr.student_name,
      getCleanSectionLetter(nr.raw_section || nr.section) || nr.section,
      nr.branch || 'AIML',
      nr.year ?? 3,
      nr.batch || '2023-2027',
      'Not Responded'
    ]);
  });

  const wsNonResponders = XLSX.utils.aoa_to_sheet(nonResponderRows);
  wsNonResponders['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 }
  ];
  wsNonResponders['!autofilter'] = { ref: `A1:H${Math.max(1, nonResponderRows.length)}` };
  XLSX.utils.book_append_sheet(wb, wsNonResponders, 'Not Responded');

  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const fileName = `AU_Placera_Poll_Results_${cleanFileName(poll.question)}.xlsx`;
  triggerDownload(blob, fileName);
};

/**
 * Professional PDF Report Generator
 */
export const exportPollToPdf = (analytics: PollAnalyticsSummary) => {
  const { poll, total_students, students_voted, not_responded, response_rate, option_breakdown, section_breakdown } = analytics;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner (Deep Navy #0B3C5D)
  doc.setFillColor(11, 60, 93);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AU PLACERA', 15, 11);

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('POLL REPORT', 15, 18);

  const exportDate = new Date().toLocaleString();
  doc.setFontSize(8);
  doc.text(`GENERATED: ${exportDate}`, pageWidth - 15, 15, { align: 'right' });

  // 2. Poll Details Section
  let currentY = 32;
  doc.setTextColor(11, 60, 93);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('POLL DETAILS', 15, currentY);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);

  currentY += 8;
  doc.setTextColor(30, 41, 59);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Question:', 15, currentY);
  doc.setFont('Helvetica', 'normal');
  const splitQuestion = doc.splitTextToSize(poll.question, pageWidth - 45);
  doc.text(splitQuestion, 35, currentY);
  currentY += splitQuestion.length * 5 + 3;

  // Metadata Table
  const metadataRows = [
    [
      { content: 'Created Date:', styles: { fontStyle: 'bold' } },
      new Date(poll.created_at).toLocaleDateString(),
      { content: 'Poll Type:', styles: { fontStyle: 'bold' } },
      poll.allow_multiple_answers ? 'Multiple Answers Allowed' : 'Single Answer Only'
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    body: metadataRows as any,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 50 },
      2: { cellWidth: 28 },
      3: { cellWidth: 65 }
    },
    margin: { left: 15, right: 15 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. Overall Statistics Table
  doc.setTextColor(11, 60, 93);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OVERALL STATISTICS', 15, currentY);
  doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);
  currentY += 6;

  const statsTableRows = [
    [
      { content: 'Total Students', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Students Voted', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Not Responded', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Response Rate', styles: { halign: 'center', fontStyle: 'bold' } }
    ],
    [
      { content: String(total_students), styles: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: [11, 60, 93] } },
      { content: String(students_voted), styles: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: [16, 185, 129] } },
      { content: String(not_responded), styles: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: [239, 68, 68] } },
      { content: `${response_rate}%`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: [217, 179, 16] } }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    body: statsTableRows as any,
    theme: 'grid',
    styles: { cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249] },
    margin: { left: 15, right: 15 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Option Results
  doc.setTextColor(11, 60, 93);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OPTION RESULTS', 15, currentY);
  doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);
  currentY += 6;

  const optionHeaders = ['Option Choice', 'Students Selected', 'Percentage (%)'];
  const optionRows = option_breakdown.map(opt => [
    opt.option_text,
    String(opt.votes),
    `${opt.percentage}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [optionHeaders],
    body: optionRows,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [11, 60, 93], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' }
    },
    margin: { left: 15, right: 15 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. Section-wise Results Table (Dynamic Columns)
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  doc.setTextColor(11, 60, 93);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SECTION-WISE RESULTS', 15, currentY);
  doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);
  currentY += 6;

  const secHeaders = ['Section'];
  poll.options.forEach(opt => {
    secHeaders.push(opt.option_text);
  });
  secHeaders.push('Voted', 'Eligible', 'Rate (%)');

  const secTableRows = section_breakdown.map(sec => {
    const row = [sec.display_section];
    poll.options.forEach(opt => {
      row.push(String(sec.option_counts[opt.id] || 0));
    });
    row.push(String(sec.students_voted), String(sec.eligible_students), `${sec.response_rate}%`);
    return row;
  });

  autoTable(doc, {
    startY: currentY,
    head: [secHeaders],
    body: secTableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [50, 140, 193], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold', halign: 'left' }
    },
    margin: { left: 15, right: 15 }
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.line(15, 285, pageWidth - 15, 285);
    doc.text('Generated by AU Placera — Anurag University', 15, 290);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, 290, { align: 'right' });
  }

  const fileName = `AU_Placera_Poll_Report_${cleanFileName(poll.question)}.pdf`;
  doc.save(fileName);
};
