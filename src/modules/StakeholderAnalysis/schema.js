export const SENTIMENTS = ['Champion', 'Supporter', 'Neutral', 'Skeptic', 'Resistor'];
export const PRIORITIES = ['High', 'Medium', 'Low'];

export const SENTIMENT_COLORS = {
  Champion: '#22C55E',
  Supporter: '#3B82F6',
  Neutral: '#9CA3AF',
  Skeptic: '#F97316',
  Resistor: '#EF4444',
};

export const PRIORITY_SIZES = {
  High: 16,
  Medium: 11,
  Low: 7,
};

export const emptyStakeholder = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  name: '',
  role: '',
  department: '',
  influence: 5,
  interest: 5,
  sentiment: 'Neutral',
  priority: 'Medium',
  concerns: '',
  actions: '',
});

export const MOCK_STAKEHOLDERS = [
  { id: '1', name: 'Sarah Chen', role: 'CFO', department: 'Finance', influence: 9, interest: 8, sentiment: 'Supporter', priority: 'High', concerns: 'Budget overruns, ROI timeline', actions: 'Monthly progress briefings, detailed cost-benefit reports' },
  { id: '2', name: 'Marcus Johnson', role: 'VP Operations', department: 'Operations', influence: 8, interest: 9, sentiment: 'Champion', priority: 'High', concerns: 'Implementation timeline, staff capacity', actions: 'Include as change champion, weekly syncs' },
  { id: '3', name: 'Diana Ross', role: 'CHRO', department: 'HR', influence: 7, interest: 7, sentiment: 'Supporter', priority: 'High', concerns: 'Employee morale, training capacity', actions: 'Co-develop training strategy, regular check-ins' },
  { id: '4', name: 'Tom Baker', role: 'IT Director', department: 'IT', influence: 7, interest: 8, sentiment: 'Neutral', priority: 'Medium', concerns: 'Technical debt, integration complexity', actions: 'Technical deep-dives, involve in architecture decisions' },
  { id: '5', name: 'Lisa Wang', role: 'Sales Director', department: 'Sales', influence: 6, interest: 4, sentiment: 'Skeptic', priority: 'Medium', concerns: 'Sales disruption during transition', actions: 'Show quick wins, minimize sales process disruption' },
  { id: '6', name: 'James Miller', role: 'Legal Counsel', department: 'Legal', influence: 6, interest: 3, sentiment: 'Neutral', priority: 'Low', concerns: 'Compliance implications', actions: 'Keep informed via email updates, review milestones' },
  { id: '7', name: 'Priya Patel', role: 'Warehouse Manager', department: 'Operations', influence: 4, interest: 9, sentiment: 'Resistor', priority: 'High', concerns: 'Job security, unfamiliar technology', actions: 'One-on-one meetings, involve in pilot program, address job security concerns directly' },
  { id: '8', name: 'Robert Kim', role: 'Marketing Manager', department: 'Marketing', influence: 3, interest: 5, sentiment: 'Supporter', priority: 'Low', concerns: 'Brand messaging during transition', actions: 'Include in communication planning' },
  { id: '9', name: 'Elena Vasquez', role: 'Board Member', department: 'Executive', influence: 10, interest: 6, sentiment: 'Neutral', priority: 'High', concerns: 'Strategic alignment, shareholder value', actions: 'Quarterly board presentations, executive summary reports' },
  { id: '10', name: 'David Brown', role: 'Finance Analyst', department: 'Finance', influence: 2, interest: 7, sentiment: 'Skeptic', priority: 'Low', concerns: 'New system learning curve', actions: 'Early training access, peer support network' },
];

export const AI_SYSTEM_PROMPT = `You are an Organizational Change Management (OCM) expert assistant. The user will provide unstructured text about stakeholders (interview notes, meeting summaries, emails, etc.).

Your task is to extract structured stakeholder data from this text.

Return ONLY valid JSON in this exact format:
{
  "stakeholders": [
    {
      "name": "string - stakeholder's name",
      "role": "string - their role or title",
      "department": "string - their department",
      "influence": number between 1 and 10,
      "interest": number between 1 and 10,
      "sentiment": "one of: Champion, Supporter, Neutral, Skeptic, Resistor",
      "priority": "one of: High, Medium, Low",
      "concerns": "string - their key concerns about the change",
      "actions": "string - recommended engagement actions"
    }
  ]
}

Rules:
- Extract all stakeholders mentioned in the text
- If influence or interest is not explicitly stated, infer from context
- Sentiment should be inferred from their described attitude toward the change
- Priority should be based on the combination of influence, interest, and potential impact
- Be thorough - look for both explicitly named people and implied stakeholder groups`;

export const AI_ENGAGEMENT_PROMPT = `You are an OCM expert. Analyze the following stakeholder data and provide tailored engagement recommendations for the top 3 highest-priority stakeholders (focusing on those with High priority or the highest combined influence+interest scores).

For each stakeholder, provide:
1. A brief analysis of their position (1 sentence)
2. 2-3 specific talking points for engaging them
3. One recommended immediate action

Format your response as clear, readable text with stakeholder names as headers. Be specific and actionable.

Stakeholder Data:
`;
