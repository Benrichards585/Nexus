import { BarChart3, Users, GitBranch, MessageSquare, BookOpen, Mail, GraduationCap } from 'lucide-react';
import ChangeImpactAssessment from './ChangeImpactAssessment';
import StakeholderAnalysis from './StakeholderAnalysis';
import CommunicationsGenerator from './CommunicationsGenerator';
import TrainingGenerator from './TrainingGenerator';

export const moduleRegistry = [
  {
    id: 'change-impact-assessment',
    label: 'Change Impact Assessment',
    icon: BarChart3,
    component: ChangeImpactAssessment,
    description: 'Assess how changes impact different parts of the organization across multiple dimensions.',
    status: 'active',
  },
  {
    id: 'stakeholder-analysis',
    label: 'Stakeholder Analysis',
    icon: Users,
    component: StakeholderAnalysis,
    description: 'Map stakeholders by influence, interest, and sentiment to prioritize engagement.',
    status: 'active',
  },
  {
    id: 'communications-generator',
    label: 'Communications Generator',
    icon: Mail,
    component: CommunicationsGenerator,
    description: 'Create customized change communications powered by AI.',
    status: 'active',
  },
  {
    id: 'training-generator',
    label: 'Training Generator',
    icon: GraduationCap,
    component: TrainingGenerator,
    description: 'Generate training materials in PowerPoint or Word from source documents.',
    status: 'active',
  },
  {
    id: 'change-readiness',
    label: 'Change Readiness Survey',
    icon: BookOpen,
    component: null,
    description: 'Assess organizational readiness for change with structured surveys.',
    status: 'coming-soon',
  },
  {
    id: 'communication-plan',
    label: 'Communication Planner',
    icon: MessageSquare,
    component: null,
    description: 'Plan and track change communication activities.',
    status: 'coming-soon',
  },
  {
    id: 'resistance-management',
    label: 'Resistance Management',
    icon: GitBranch,
    component: null,
    description: 'Identify and manage resistance to change.',
    status: 'coming-soon',
  },
];
