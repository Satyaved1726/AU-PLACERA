import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PollAnalyticsSummary } from '../../../types';
import { formatSectionLabel } from '../pollService';

/**
 * Trigger file download helper
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

/**
 * Generates a clean filename safe string from text
 */
const cleanFileName = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
    .replace(/^_|_$/g, '');
};

/**
 * Export Poll Results to a multi-sheet Excel (.xlsx) file
 */
export const exportPollToExcel = (analytics: PollAnalyticsSummary) => {
  const { poll, total_eligible, total_responses, not_responded, response_rate, option_breakdown, section_breakdown, student_responses, non_responders } = analytics;
  const wb = XLSX.utils.book_new();

  // --------------------------------------------------------------------------
  // SHEET 1: Poll Summary
  // --------------------------------------------------------------------------
  const targetSections = poll.audience.map(a => formatSectionLabel(a.section)).join(', ') || 'All Sections';
  const createdByName = poll.profiles?.full_name || 'Placement Administrator';

  const summaryData = [
    ['AU PLACERA — STUDENT POLL SUMMARY REPORT'],
    [],
    ['Poll Question', poll.question],
    ['Description', poll.description || 'N/A'],
    ['Created By', createdByName],
    ['Created Date', new Date(poll.created_at).toLocaleString()],
    ['Poll Status', poll.status.toUpperCase()],
    ['Start Date', poll.start_date ? new Date(poll.start_date).toLocaleString() : 'N/A'],
    ['End Date (Deadline)', poll.end_date ? new Date(poll.end_date).toLocaleString() : 'Open until closed by admin'],
    ['Allow Response Change', poll.allow_response_change ? 'Yes' : 'No'],
    [],
    ['TARGET AUDIENCE'],
    ['Department', poll.department],
    ['Batch', poll.batch],
    ['Target Sections', targetSections],
    [],
    ['OVERALL METRICS'],
    ['Total Eligible Students', total_eligible],
    ['Total Responses', total_responses],
    ['Not Responded', not_responded],
    ['Response Rate', `${response_rate}%`],
    [],
    ['Report Generated', new Date().toLocaleString()]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Poll Summary');

  // --------------------------------------------------------------------------
  // SHEET 2: Overall Results
  // --------------------------------------------------------------------------
  const overallRows: any[][] = [
    ['Option', 'Votes Count', 'Percentage (%)']
  ];

  option_breakdown.forEach(opt => {
    overallRows.push([opt.option_text, opt.votes, `${opt.percentage}%`]);
  });

  overallRows.push([]);
  overallRows.push(['Total Votes Cast', total_responses, '100%']);

  const wsOverall = XLSX.utils.aoa_to_sheet(overallRows);
  wsOverall['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsOverall, 'Overall Results');

  // --------------------------------------------------------------------------
  // SHEET 3: Section-wise Results
  // --------------------------------------------------------------------------
  const sectionHeaders = ['Section'];
  poll.options.forEach(opt => {
    sectionHeaders.push(`${opt.option_text} Count`);
  });
  sectionHeaders.push('Total Responses', 'Eligible Students', 'Response Rate (%)');

  const sectionRows: any[][] = [sectionHeaders];

  section_breakdown.forEach(sec => {
    const row: any[] = [sec.display_section];
    poll.options.forEach(opt => {
      row.push(sec.option_counts[opt.id] || 0);
    });
    row.push(sec.total_responses, sec.eligible_students, `${sec.response_rate}%`);
    sectionRows.push(row);
  });

  const wsSection = XLSX.utils.aoa_to_sheet(sectionRows);
  wsSection['!cols'] = sectionHeaders.map((h, i) => ({ wch: Math.max(h.length + 3, i === 0 ? 16 : 14) }));
  XLSX.utils.book_append_sheet(wb, wsSection, 'Section-wise Results');

  // --------------------------------------------------------------------------
  // SHEET 4: Student Responses
  // --------------------------------------------------------------------------
  const studentRows: any[][] = [
    ['S.No', 'Roll Number', 'Student Name', 'Section', 'Response Chosen', 'Responded At']
  ];

  student_responses.forEach((resp, idx) => {
    studentRows.push([
      idx + 1,
      resp.roll_number,
      resp.student_name,
      resp.section,
      resp.option_text,
      new Date(resp.responded_at).toLocaleString()
    ]);
  });

  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  wsStudents['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 25 },
    { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Student Responses');

  // --------------------------------------------------------------------------
  // SHEET 5: Non-Responders
  // --------------------------------------------------------------------------
  const nonResponderRows: any[][] = [
    ['S.No', 'Roll Number', 'Student Name', 'Section', 'Status']
  ];

  non_responders.forEach((nr, idx) => {
    nonResponderRows.push([
      idx + 1,
      nr.roll_number,
      nr.student_name,
      nr.section,
      nr.status
    ]);
  });

  const wsNonResponders = XLSX.utils.aoa_to_sheet(nonResponderRows);
  wsNonResponders['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsNonResponders, 'Non-Responders');

  // Write Excel file and trigger download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const fileName = `AU_Placera_Poll_Results_${cleanFileName(poll.question)}.xlsx`;
  triggerDownload(blob, fileName);
};

/**
 * Export Poll Results to a branded, high-quality PDF report
 */
export const exportPollToPdf = (analytics: PollAnalyticsSummary) => {
  const { poll, total_eligible, total_responses, not_responded, response_rate, option_breakdown, section_breakdown } = analytics;
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
  doc.text('ANURAG UNIVERSITY — PLACEMENTS PORTAL', 15, 12);

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('OFFICIAL STUDENT POLL & ANALYTICS REPORT', 15, 18);

  const exportDate = new Date().toLocaleString();
  doc.setFontSize(8);
  doc.text(`EXPORT DATE: ${exportDate}`, pageWidth - 15, 15, { align: 'right' });

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
  doc.setFontSize(9);
  doc.text('Question:', 15, currentY);
  doc.setFont('Helvetica', 'normal');
  const splitQuestion = doc.splitTextToSize(poll.question, pageWidth - 45);
  doc.text(splitQuestion, 35, currentY);
  currentY += splitQuestion.length * 4.5 + 2;

  if (poll.description) {
    doc.setFont('Helvetica', 'bold');
    doc.text('Description:', 15, currentY);
    doc.setFont('Helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(poll.description, pageWidth - 45);
    doc.text(splitDesc, 35, currentY);
    currentY += splitDesc.length * 4 + 2;
  }

  // Metadata inline table
  const targetSections = poll.audience.map(a => formatSectionLabel(a.section)).join(', ') || 'All Sections';
  const metadataRows = [
    [
      { content: 'Status:', styles: { fontStyle: 'bold' } },
      poll.status.toUpperCase(),
      { content: 'Target Audience:', styles: { fontStyle: 'bold' } },
      `${poll.department} | ${poll.batch} (${targetSections})`
    ],
    [
      { content: 'Created By:', styles: { fontStyle: 'bold' } },
      poll.profiles?.full_name || 'Placement Admin',
      { content: 'Created Date:', styles: { fontStyle: 'bold' } },
      new Date(poll.created_at).toLocaleDateString()
    ],
    [
      { content: 'Deadline:', styles: { fontStyle: 'bold' } },
      poll.end_date ? new Date(poll.end_date).toLocaleString() : 'Open until closed',
      { content: 'Response Changes:', styles: { fontStyle: 'bold' } },
      poll.allow_response_change ? 'Permitted' : 'Locked upon submission'
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    body: metadataRows as any,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 55 },
      2: { cellWidth: 32 },
      3: { cellWidth: 65 }
    },
    margin: { left: 15, right: 15 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. Overall Statistics
  doc.setTextColor(11, 60, 93);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OVERALL STATISTICS', 15, currentY);
  doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);
  currentY += 6;

  const statsTableRows = [
    [
      { content: 'Eligible Students', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Total Responses', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Not Responded', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Response Rate', styles: { halign: 'center', fontStyle: 'bold' } }
    ],
    [
      { content: String(total_eligible), styles: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: [11, 60, 93] } },
      { content: String(total_responses), styles: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: [16, 185, 129] } },
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

  // 4. Option-wise Results Table
  doc.setTextColor(11, 60, 93);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OPTION-WISE RESULTS', 15, currentY);
  doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);
  currentY += 6;

  const optionHeaders = ['Option Choice', 'Votes Count', 'Percentage (%)'];
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

  // 5. Section-wise Results Table
  // If remaining space on page is small, add new page
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  doc.setTextColor(11, 60, 93);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SECTION-WISE ANALYTICS', 15, currentY);
  doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);
  currentY += 6;

  const secHeaders = ['Section'];
  poll.options.forEach(opt => {
    secHeaders.push(opt.option_text);
  });
  secHeaders.push('Responses', 'Eligible', 'Rate (%)');

  const secTableRows = section_breakdown.map(sec => {
    const row = [sec.display_section];
    poll.options.forEach(opt => {
      row.push(String(sec.option_counts[opt.id] || 0));
    });
    row.push(String(sec.total_responses), String(sec.eligible_students), `${sec.response_rate}%`);
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
      0: { cellWidth: 32, fontStyle: 'bold', halign: 'left' }
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
    doc.text('AU PLACERA — Confidential Departmental Placement Document', 15, 290);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, 290, { align: 'right' });
  }

  const fileName = `AU_Placera_Poll_Report_${cleanFileName(poll.question)}.pdf`;
  doc.save(fileName);
};
