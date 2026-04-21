import React, { useState, useEffect } from 'react';
import InputForm from './InputForm';
import AIAssist from './AIAssist';
import { emptyComm } from './schema';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';

export default function CommunicationsGenerator({ data, setData, initiative, moduleId }) {
  const [formData, setFormData] = useState(data?.formData || emptyComm());
  const [generatedComm, setGeneratedComm] = useState(data?.generatedComm || null);
  const [history, setHistory] = useState(data?.history || []);

  useEffect(() => {
    setData({ formData, generatedComm, history });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, generatedComm, history]);

  // Save to history when a new comm is generated
  const handleSetGenerated = (comm) => {
    setGeneratedComm(comm);
    if (comm) {
      setHistory(prev => [{
        ...comm,
        commType: formData.commType,
        audience: formData.audience,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20));
    }
  };

  const exportPDF = () => {
    if (!generatedComm) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
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
    pdf.text('Communication Draft', 14, 20);
    pdf.setFontSize(8);
    pdf.setTextColor(180, 180, 200);
    pdf.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: 'right' });

    let y = 36;
    pdf.setTextColor(26, 31, 54);
    pdf.setFontSize(10);
    pdf.text(`Type: ${formData.commType}`, 14, y); y += 5;
    pdf.text(`Audience: ${formData.audience}`, 14, y); y += 8;

    pdf.setFontSize(11);
    pdf.setTextColor(26, 31, 54);
    pdf.text('Subject:', 14, y); y += 5;
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);
    pdf.text(generatedComm.subjectLine, 14, y); y += 10;

    pdf.setFontSize(11);
    pdf.setTextColor(26, 31, 54);
    pdf.text('Email Body:', 14, y); y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(50, 50, 50);
    const lines = pdf.splitTextToSize(generatedComm.emailBody, pageWidth - 28);
    lines.forEach(line => {
      if (y > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, 14, y);
      y += 4.5;
    });

    if (generatedComm.tipsForSender) {
      y += 6;
      if (y > 260) { pdf.addPage(); y = 20; }
      pdf.setFontSize(10);
      pdf.setTextColor(26, 31, 54);
      pdf.text('Tips for Sender:', 14, y); y += 5;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      const tipLines = pdf.splitTextToSize(generatedComm.tipsForSender, pageWidth - 28);
      tipLines.forEach(line => {
        if (y > 275) { pdf.addPage(); y = 20; }
        pdf.text(line, 14, y);
        y += 4;
      });
    }

    pdf.save(`Communication-${formData.commType.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-screen-xl slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Communications Generator</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Create customized change communications powered by AI
          </p>
        </div>
        {generatedComm && (
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
            <FileDown size={13} /> Export PDF
          </button>
        )}
      </div>

      <InputForm formData={formData} setFormData={setFormData} />
      <AIAssist formData={formData} generatedComm={generatedComm} setGeneratedComm={handleSetGenerated} initiative={initiative} moduleId={moduleId} />

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-border">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Recent Communications</h3>
          </div>
          <div className="divide-y divide-border-light">
            {history.slice(0, 5).map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors cursor-pointer"
                onClick={() => setGeneratedComm(item)}>
                <div>
                  <div className="text-sm font-medium text-text-primary">{item.subjectLine}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {item.commType} · {item.audience} · {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-[10px] text-text-muted">Click to view</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
