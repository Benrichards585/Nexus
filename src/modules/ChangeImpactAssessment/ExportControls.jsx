import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export default function ExportControls({ rows, aiInsights, vizRef }) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(26, 31, 54);
      pdf.rect(0, 0, pageWidth, 26, 'F');
      // Cognizant branding
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(4, 152, 183);
      pdf.text('cognizant', 14, 9);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text('|', 44, 9);
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 200);
      pdf.text('OCM Nexus', 48, 9);
      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.text('Change Impact Assessment', 14, 20);
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 200);
      pdf.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: 'right' });

      let yPos = 36;

      if (vizRef?.current) {
        const canvas = await html2canvas(vizRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        const availableH = pageHeight - yPos - 10;

        if (imgHeight <= availableH) {
          // Fits on current page — use full width
          pdf.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 8;
        } else {
          // Too tall — give it a dedicated page, scale to fit full page height
          pdf.addPage();
          const dedicatedH = pageHeight - 20; // 10mm top + 10mm bottom margin
          let finalWidth = imgWidth;
          let finalHeight = imgHeight;
          if (finalHeight > dedicatedH) {
            finalHeight = dedicatedH;
            finalWidth = (canvas.width / canvas.height) * finalHeight;
          }
          // Center horizontally if scaled down
          const xOffset = 14 + (imgWidth - finalWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, 10, finalWidth, finalHeight);
          yPos = 10 + finalHeight + 8;
        }
      }

      if (aiInsights) {
        pdf.setTextColor(26, 31, 54);
        pdf.setFontSize(11);
        pdf.text('AI Insights', 14, yPos);
        yPos += 6;
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        const lines = pdf.splitTextToSize(aiInsights, pageWidth - 28);
        pdf.text(lines, 14, yPos);
        yPos += lines.length * 4 + 8;
      }

      if (rows.length > 0) {
        pdf.setTextColor(26, 31, 54);
        pdf.setFontSize(11);
        pdf.text('Impact Data', 14, yPos);
        yPos += 6;
        const headers = ['Org Group', 'Change Type', 'Impact', 'People', 'Timeline', 'Readiness', 'Notes'];
        const colWidths = [35, 30, 18, 18, 24, 18, pageWidth - 28 - 143];
        pdf.setFillColor(248, 250, 252);
        pdf.rect(14, yPos - 3.5, pageWidth - 28, 6, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        let xPos = 14;
        headers.forEach((h, i) => { pdf.text(h, xPos, yPos); xPos += colWidths[i]; });
        yPos += 5;
        pdf.setTextColor(50, 50, 50);
        rows.forEach(row => {
          if (yPos > 185) { pdf.addPage(); yPos = 20; }
          xPos = 14;
          [row.orgGroup, row.changeType, row.impactLevel, String(row.peopleAffected), row.timelineSensitivity, `${row.readiness}/5`, row.notes || '']
            .forEach((v, i) => { pdf.text(pdf.splitTextToSize(v, colWidths[i] - 2)[0] || '', xPos, yPos); xPos += colWidths[i]; });
          yPos += 5;
        });
      }

      pdf.save('Change-Impact-Assessment.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = () => {
    const data = rows.map(({ id, ...rest }) => ({
      'Organizational Group': rest.orgGroup,
      'Change Type': rest.changeType,
      'Impact Level': rest.impactLevel,
      'People Affected': rest.peopleAffected,
      'Timeline Sensitivity': rest.timelineSensitivity,
      'Current Readiness': rest.readiness,
      'Notes': rest.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Impact Assessment');
    ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 40 }];
    XLSX.writeFile(wb, 'Change-Impact-Assessment.xlsx');
  };

  if (rows.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportPDF}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
        PDF
      </button>
      <button
        onClick={exportExcel}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
      >
        <FileSpreadsheet size={13} />
        Excel
      </button>
    </div>
  );
}
