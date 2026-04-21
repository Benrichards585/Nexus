export const CHANGE_TYPES = ['Process', 'Technology', 'Organizational Structure', 'Policy', 'Culture'];
export const IMPACT_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
export const TIMELINE_OPTIONS = ['Immediate', 'Short-term', 'Long-term'];

export const IMPACT_COLORS = {
  Low: '#22C55E',
  Medium: '#EAB308',
  High: '#F97316',
  Critical: '#EF4444',
};

export const emptyRow = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  orgGroup: '',
  changeType: CHANGE_TYPES[0],
  impactLevel: IMPACT_LEVELS[0],
  peopleAffected: 0,
  timelineSensitivity: TIMELINE_OPTIONS[0],
  readiness: 3,
  notes: '',
});

export const MOCK_DATA = [
  { id: '1', orgGroup: 'Finance', changeType: 'Technology', impactLevel: 'High', peopleAffected: 120, timelineSensitivity: 'Immediate', readiness: 2, notes: 'New ERP system rollout affecting all finance operations' },
  { id: '2', orgGroup: 'Finance', changeType: 'Process', impactLevel: 'Medium', peopleAffected: 80, timelineSensitivity: 'Short-term', readiness: 3, notes: 'Updated approval workflows' },
  { id: '3', orgGroup: 'HR', changeType: 'Technology', impactLevel: 'Medium', peopleAffected: 45, timelineSensitivity: 'Short-term', readiness: 4, notes: 'HRIS migration to cloud platform' },
  { id: '4', orgGroup: 'HR', changeType: 'Policy', impactLevel: 'Low', peopleAffected: 200, timelineSensitivity: 'Long-term', readiness: 4, notes: 'Remote work policy updates' },
  { id: '5', orgGroup: 'Operations', changeType: 'Process', impactLevel: 'Critical', peopleAffected: 350, timelineSensitivity: 'Immediate', readiness: 1, notes: 'Complete overhaul of supply chain processes' },
  { id: '6', orgGroup: 'Operations', changeType: 'Technology', impactLevel: 'High', peopleAffected: 200, timelineSensitivity: 'Immediate', readiness: 2, notes: 'Warehouse automation system' },
  { id: '7', orgGroup: 'Sales', changeType: 'Technology', impactLevel: 'Medium', peopleAffected: 150, timelineSensitivity: 'Short-term', readiness: 3, notes: 'CRM platform switch' },
  { id: '8', orgGroup: 'Sales', changeType: 'Culture', impactLevel: 'High', peopleAffected: 150, timelineSensitivity: 'Long-term', readiness: 2, notes: 'Shift to consultative selling methodology' },
  { id: '9', orgGroup: 'IT', changeType: 'Organizational Structure', impactLevel: 'High', peopleAffected: 60, timelineSensitivity: 'Immediate', readiness: 3, notes: 'Team restructuring to product-based model' },
  { id: '10', orgGroup: 'IT', changeType: 'Technology', impactLevel: 'Low', peopleAffected: 60, timelineSensitivity: 'Short-term', readiness: 5, notes: 'DevOps toolchain upgrade' },
  { id: '11', orgGroup: 'Legal', changeType: 'Policy', impactLevel: 'Medium', peopleAffected: 25, timelineSensitivity: 'Long-term', readiness: 4, notes: 'Compliance framework updates for new regulations' },
  { id: '12', orgGroup: 'Marketing', changeType: 'Culture', impactLevel: 'Low', peopleAffected: 40, timelineSensitivity: 'Long-term', readiness: 4, notes: 'Data-driven decision making adoption' },
];

export const AI_SYSTEM_PROMPT = `You are an Organizational Change Management (OCM) expert assistant. The user will provide unstructured text describing a change initiative (meeting notes, emails, summaries, etc.).

Your task is to extract structured change impact data from this text.

Return ONLY valid JSON in this exact format:
{
  "rows": [
    {
      "orgGroup": "string - the organizational group/department affected",
      "changeType": "one of: Process, Technology, Organizational Structure, Policy, Culture",
      "impactLevel": "one of: Low, Medium, High, Critical",
      "peopleAffected": number,
      "timelineSensitivity": "one of: Immediate, Short-term, Long-term",
      "readiness": number between 1 and 5,
      "notes": "string - brief description of the specific impact"
    }
  ]
}

Rules:
- Extract as many distinct impacts as you can identify from the text
- If the number of people affected is not mentioned, estimate based on context
- If readiness is not mentioned, estimate based on the tone and context
- Be thorough - look for both explicit and implicit impacts
- Each row should represent one specific impact on one organizational group`;

export const AI_INSIGHTS_PROMPT = `You are an OCM expert. Analyze the following change impact data and provide a 2-3 sentence plain-language summary of the overall change risk profile. Highlight the most critical areas and any patterns you see. Be specific and actionable.

Data:
`;
