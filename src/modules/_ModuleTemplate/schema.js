/**
 * MODULE TEMPLATE — schema.js
 *
 * This file defines your module's data schema: constants, default values,
 * and AI prompts. Rename everything prefixed with "Template" or "TEMPLATE"
 * to match your module's domain.
 */

// -- Constants (dropdowns, enums, etc.) --
export const TEMPLATE_OPTIONS = ['Option A', 'Option B', 'Option C'];

// -- Empty row/entry factory --
// Returns a fresh data object with a unique ID. Used when adding new rows.
export const emptyRow = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  label: '',
  category: TEMPLATE_OPTIONS[0],
  notes: '',
});

// -- Mock / seed data (optional, for demo purposes) --
export const MOCK_DATA = [
  { id: '1', label: 'Example Item', category: 'Option A', notes: 'Sample data for demonstration' },
];

// -- AI System Prompt --
// Tells the AI what role to play and what JSON structure to return.
export const AI_SYSTEM_PROMPT = `You are an Organizational Change Management (OCM) expert assistant.
The user will provide unstructured text related to [YOUR DOMAIN].

Your task is to extract structured data from this text.

Return ONLY valid JSON in this exact format:
{
  "rows": [
    {
      "label": "string",
      "category": "one of: Option A, Option B, Option C",
      "notes": "string"
    }
  ]
}

Rules:
- Extract as many distinct items as you can identify from the text
- Be thorough — look for both explicit and implicit information`;

// -- AI Insights / Recommendations Prompt --
export const AI_INSIGHTS_PROMPT = `Analyze the following data and provide a 2-3 sentence plain-language summary. Highlight the most critical findings and actionable next steps.

Data:
`;
