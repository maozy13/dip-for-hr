export type Trend = 'up' | 'down' | 'flat';
export type DeptStatus = 'good' | 'warn' | 'bad';

export interface MetricDetail {
  rule: string;
  baseline: number;
  attainment: number;
  history: { label: string; value: number; ratio?: number }[];
}

export interface MetricSummary {
  id: string;
  name: string;
  value: number;
  unit: string;
  yoy: number;
  trend: Trend;
  detail: MetricDetail;
}

export interface OrgNode {
  id: string;
  name: string;
  leader: string;
  status: DeptStatus;
  baseline: number;
  value: number;
  headcount?: number;
  metrics?: Array<{ id: string; name: string; value: number; unit: string }>;
  detail?: MetricDetail & {
    statusSummary?: string;
    rootCause?: string;
    actions?: string[];
  };
  children?: OrgNode[];
}

export interface CorrelationMetric {
  id: string;
  name: string;
  coefficient: number;
  direction: 'positive' | 'negative';
  description: string;
  value: number;
  detail: {
    rule: string;
    breakdown: { label: string; value: number }[];
  };
}

export interface CopilotContent {
  title: string;
  summary: string;
  rule?: string;
  baseline?: number;
  attainment?: number;
  history?: { label: string; value: number; ratio?: number }[];
  statusSummary?: string;
  rootCause?: string;
  actions?: string[];
}

export interface CopilotMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
}
