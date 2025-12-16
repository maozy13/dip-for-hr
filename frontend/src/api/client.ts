import { CorrelationMetric, MetricSummary, OrgNode } from '../types';

const API_BASE = 'http://localhost:5001/api';

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface SummaryResponse {
  metrics: MetricSummary[];
  defaultDeptId: string;
}

export interface OrgResponse {
  tree: OrgNode;
}

export interface CorrelationResponse {
  deptId: string;
  metrics: CorrelationMetric[];
}

export const fetchSummary = () => request<SummaryResponse>('/summary');
export const fetchOrg = () => request<OrgResponse>('/org');
export const fetchCorrelations = (deptId: string) =>
  request<CorrelationResponse>(`/correlations?deptId=${encodeURIComponent(deptId)}`);
export const searchDepartments = (query: string) =>
  request<{ matchedDepartments: string[] }>(`/search?query=${encodeURIComponent(query)}`);
