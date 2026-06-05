export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  hierarchy_level: string;
  entity_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GeneralCouncil {
  id: number;
  name: string;
  country: string;
  created_at: string;
}

export interface District {
  id: number;
  name: string;
  general_council_id: number;
  created_at: string;
}

export interface Section {
  id: number;
  name: string;
  district_id: number;
  created_at: string;
}

export interface LocalChurch {
  id: number;
  name: string;
  section_id: number;
  pastor_name: string | null;
  member_count: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  transaction_type: string;
  amount: number;
  from_entity_type: string | null;
  from_entity_id: number | null;
  to_entity_type: string | null;
  to_entity_id: number | null;
  status: string;
  description: string | null;
  receipt_number: string | null;
  approved_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface AllocationRule {
  id: number;
  name: string;
  level: string;
  amount: number;
  description: string | null;
  is_fixed: boolean;
  created_at: string;
}

export interface DelegationRule {
  id: number;
  name: string;
  level: string;
  min_amount: number;
  max_amount: number | null;
  requires_approval_from: string;
  created_at: string;
}

export interface Report {
  id: number;
  title: string;
  report_type: string;
  entity_type: string | null;
  entity_id: number | null;
  period_start: string | null;
  period_end: string | null;
  generated_by: number | null;
  file_path: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_transactions: number;
  total_amount: number;
  pending_transactions: number;
  completed_transactions: number;
  monthly_income: number;
  monthly_expenses: number;
  hierarchy_breakdown: {
    general_councils: number;
    districts: number;
    sections: number;
    churches: number;
  };
  recent_transactions: any[];
  monthly_chart: { month: string; amount: number }[];
  type_breakdown: Record<string, { count: number; amount: number }>;
}

export interface HierarchyNode {
  id: number;
  name: string;
  type: string;
  country?: string;
  pastor_name?: string;
  member_count?: number;
  children: HierarchyNode[];
}

export interface UserBrief {
  id: number;
  username: string;
  role: string;
}

export interface RemittanceRule {
  id: number;
  name: string;
  from_level: string;
  to_level: string;
  fund_type: string;
  rule_type: string;
  percentage: number | null;
  fixed_amount: number | null;
  minimum_amount: number | null;
  maximum_amount: number | null;
  frequency: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  scope_entity_type: string;
  scope_entity_id: number;
  requires_dual_auth: boolean;
  status: string;
  created_by_id: number;
  created_by: UserBrief | null;
  approved_by_id: number | null;
  approved_by: UserBrief | null;
  approved_at: string | null;
  second_approver_id: number | null;
  second_approver: UserBrief | null;
  second_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemittanceRuleAuditLog {
  id: number;
  rule_id: number;
  action: string;
  changed_by_id: number;
  changed_by: UserBrief | null;
  changed_at: string;
  previous_values: string | null;
  new_values: string | null;
  note: string | null;
}

export interface RemittanceCalculateResponse {
  rule_name: string;
  rule_type: string;
  input_amount: number;
  calculated_amount: number;
  breakdown: string;
}
