import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export default function ExportControls({ rows, aiRecommendations, vizRef, matrixRef }) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

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
      pdf.text('Stakeholder Analysis', 14, 20);
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 200);
      pdf.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: 'right' });

      let yPos = 36;

      // Page 1: Power/Interest Matrix — capture just the matrix, scaled to fill the page
      const matrixEl = matrixRef?.current || vizRef?.current;
      if (matrixEl) {
        const canvas = await html2canvas(matrixEl, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        const availableH = pageHeight - yPos - 10;

        let finalWidth = imgWidth;
        let finalHeight = imgHeight;
        if (finalHeight > availableH) {
          finalHeight = availableH;
          finalWidth = (canvas.width / canvas.height) * finalHeight;
        }
        // Center horizontally
        const xOffset = 14 + (imgWidth - finalWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, yPos, finalWidth, finalHeight);
      }

      // Page 2+: Stakeholder data table
      pdf.addPage();
      yPos = 14;
      pdf.setTextColor(26, 31, 54);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Stakeholder Summary', 14, yPos);
      yPos += 7;

      if (rows.length > 0) {
        const headers = ['Name', 'Role', 'Dept', 'Influence', 'Interest', 'Sentiment', 'Priority', 'Key Concerns'];
        const colWidths = [35, 30, 25, 20, 18, 22, 18, pageWidth - 28 - 168];

        pdf.setFillColor(248, 250, 252);
        pdf.rect(14, yPos - 3.5, pageWidth - 28, 6, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 116, 139);
        let xPos = 14;
        headers.forEach((h, i) => { pdf.text(h, xPos, yPos); xPos += colWidths[i]; });
        yPos += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        rows.forEach(s => {
          if (yPos > pageHeight - 15) { pdf.addPage(); yPos = 20; }
          xPos = 14;
          [s.name || '', s.role || '', s.department || '', String(s.influence || ''), String(s.interest || ''), s.sentiment || '', s.priority || '', s.concerns || '']
            .forEach((v, i) => { pdf.text(pdf.splitTextToSize(v, colWidths[i] - 2)[0] || '', xPos, yPos); xPos += colWidths[i]; });
          yPos += 5;
        });
      }

      // AI Recommendations (if any)
      if (aiRecommendations) {
        if (yPos > pageHeight - 40) { pdf.addPage(); yPos = 20; }
        yPos += 4;
        pdf.setTextColor(26, 31, 54);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AI Engagement Recommendations', 14, yPos);
        yPos += 6;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        const lines = pdf.splitTextToSize(aiRecommendations, pageWidth - 28);
        lines.forEach(line => {
          if (yPos > pageHeight - 15) { pdf.addPage(); yPos = 20; }
          pdf.text(line, 14, yPos);
          yPos += 4;
        });
      }

      pdf.save('Stakeholder-Analysis.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = () => {
    const data = rows.map(({ id, ...rest }) => ({
      'Stakeholder Name': rest.name, 'Role / Title': rest.role, 'Department': rest.department,
      'Influence Level': rest.influence, 'Interest Level': rest.interest,
      'Current Sentiment': rest.sentiment, 'Engagement Priority': rest.priority,
      'Key Concerns': rest.concerns, 'Recommended Actions': rest.actions,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stakeholder Analysis');
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 35 }, { wch: 35 }];
    XLSX.writeFile(wb, 'Stakeholder-Analysis.xlsx');
  };

  if (rows.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <button onClick={exportPDF} disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
        {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} PDF
      </button>
      <button onClick={exportExcel}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
        <FileSpreadsheet size={13} /> Excel
      </button>
    </div>
  );
}
