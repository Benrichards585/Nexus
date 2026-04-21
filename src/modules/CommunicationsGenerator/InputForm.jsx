import React from 'react';
import { COMM_TYPES, TONE_OPTIONS } from './schema';
import { Mail, Users, HelpCircle } from 'lucide-react';

export default function InputForm({ formData, setFormData }) {
  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Mail size={15} className="text-accent" />
          Communication Details
        </h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Row 1: Type and Tone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Communication Type *</label>
            <select value={formData.commType} onChange={e => update('commType', e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white">
              {COMM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Tone *</label>
            <select value={formData.tone} onChange={e => update('tone', e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white">
              {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Subject and Audience */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Email Subject / Topic *</label>
            <input type="text" value={formData.subject} onChange={e => update('subject', e.target.value)}
              placeholder="e.g. New ERP System Go-Live on March 15"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Target Audience *</label>
            <input type="text" value={formData.audience} onChange={e => update('audience', e.target.value)}
              placeholder="e.g. All Finance Department employees"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
          </div>
        </div>

        {/* Qualifying Questions */}
        <div className="bg-accent-50 rounded-lg p-4 border border-accent-100">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent-dark">Qualifying Questions</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">
                Is this being sent to a broad group or a specific group? *
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'broad', label: 'Broad Group', desc: 'Large audience, varied roles' },
                  { value: 'specific', label: 'Specific Group', desc: 'Targeted team or role' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => update('audienceScope', opt.value)}
                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                      formData.audienceScope === opt.value
                        ? 'border-accent bg-white shadow-sm'
                        : 'border-border-light bg-white/50 hover:bg-white'
                    }`}>
                    <div className={`text-xs font-semibold ${formData.audienceScope === opt.value ? 'text-accent' : 'text-text-secondary'}`}>
                      <Users size={13} className="inline mr-1" />{opt.label}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">
                Will recipients know why they're receiving this? *
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'yes', label: 'Yes', desc: 'They have context already' },
                  { value: 'no', label: 'No', desc: 'This may be new to them' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => update('audienceAwareness', opt.value)}
                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                      formData.audienceAwareness === opt.value
                        ? 'border-accent bg-white shadow-sm'
                        : 'border-border-light bg-white/50 hover:bg-white'
                    }`}>
                    <div className={`text-xs font-semibold ${formData.audienceAwareness === opt.value ? 'text-accent' : 'text-text-secondary'}`}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key Points */}
        <div>
          <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Key Points / Main Message *</label>
          <textarea value={formData.keyPoints} onChange={e => update('keyPoints', e.target.value)}
            rows={3} placeholder="What are the main points you want to communicate? List the key information recipients need to know..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
        </div>

        {/* Dates and CTA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Important Dates / Deadlines</label>
            <input type="text" value={formData.dates} onChange={e => update('dates', e.target.value)}
              placeholder="e.g. Go-live March 15, Training by March 10"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Call to Action</label>
            <input type="text" value={formData.callToAction} onChange={e => update('callToAction', e.target.value)}
              placeholder="e.g. Complete training by March 10, Register here"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
          </div>
        </div>

        {/* Additional Context */}
        <div>
          <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Additional Context</label>
          <textarea value={formData.additionalContext} onChange={e => update('additionalContext', e.target.value)}
            rows={2} placeholder="Any other details, links, or context the AI should consider when drafting this communication..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
        </div>
      </div>
    </div>
  );
}
