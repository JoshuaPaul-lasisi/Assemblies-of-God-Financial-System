import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, ChevronRight, X, CheckCircle, Clock,
  AlertTriangle, Ban, Shield, Activity, Eye, History,
  ChevronDown, ChevronUp, GitBranch
} from 'lucide-react';
import {
  listRemittanceRules, createRemittanceRule, updateRemittanceRule,
  submitRemittanceRule, approveRemittanceRule, secondApproveRemittanceRule,
  rejectRemittanceRule, deactivateRemittanceRule,
  getRemittanceRuleAuditLog, getAllRemittanceAuditLogs
} from '../api';
import type { RemittanceRule, RemittanceRuleAuditLog } from '../types';
import type { User } from '../types';

interface Props {
  currentUser: User;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const FUND_TYPES = [
  { value: 'tithes', label: 'Tithes' },
  { value: 'building_fund', label: 'Building Fund' },
  { value: 'missions_fund', label: 'Missions Fund' },
  { value: 'general_offering', label: 'General Offering' },
  { value: 'special_offering', label: 'Special Offering' },
  { value: 'all', label: 'All Fund Types' },
];

const RULE_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'hybrid', label: 'Hybrid (% with minimum)' },
];

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const LEVELS = [
  { value: 'local_church', label: 'Local Church' },
  { value: 'section', label: 'Section' },
  { value: 'district', label: 'District' },
  { value: 'general_council', label: 'General Council' },
];

const ACTION_LABELS: Record<string, string> = {
  created: 'Created rule',
  updated: 'Updated rule',
  approved: 'Approved rule',
  rejected: 'Rejected rule',
  activated: 'Activated rule',
  deactivated: 'Deactivated rule',
  superseded: 'Superseded rule',
};

function formatFormula(rule: RemittanceRule): string {
  if (rule.rule_type === 'percentage') {
    return `${rule.percentage}% of ${rule.fund_type.replace('_', ' ')}`;
  }
  if (rule.rule_type === 'fixed') {
    return `Fixed ₦${(rule.fixed_amount || 0).toLocaleString()} / ${rule.frequency}`;
  }
  if (rule.rule_type === 'hybrid') {
    return `${rule.percentage}% of ${rule.fund_type.replace('_', ' ')}, min ₦${(rule.minimum_amount || 0).toLocaleString()}`;
  }
  return '-';
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border border-gray-300', icon: <Clock size={12} /> },
    pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800 border border-yellow-300', icon: <Clock size={12} /> },
    active: { label: 'Active', className: 'bg-green-100 text-green-800 border border-green-300', icon: <CheckCircle size={12} /> },
    superseded: { label: 'Superseded', className: 'bg-blue-100 text-blue-800 border border-blue-300', icon: <GitBranch size={12} /> },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border border-red-300', icon: <Ban size={12} /> },
  };
  const c = config[status] || config['draft'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.icon}{c.label}
    </span>
  );
}

function AuditTimeline({ logs }: { logs: RemittanceRuleAuditLog[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {logs.map((log, i) => {
        const expanded = expandedId === log.id;
        const prev = log.previous_values ? JSON.parse(log.previous_values) : null;
        const next = log.new_values ? JSON.parse(log.new_values) : null;
        const changedFields = next
          ? Object.keys(next).filter(k => JSON.stringify(prev?.[k]) !== JSON.stringify(next[k]))
          : [];
        return (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(log.changed_by?.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              {i < logs.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-navy-900">
                  {log.changed_by?.username || `User #${log.changed_by_id}`}
                </span>
                <span className="text-sm text-gray-600">{ACTION_LABELS[log.action] || log.action}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(log.changed_at).toLocaleString()}
                </span>
              </div>
              {log.note && <p className="text-xs text-gray-500 mt-0.5">{log.note}</p>}
              {(prev || next) && changedFields.length > 0 && (
                <button
                  onClick={() => setExpandedId(expanded ? null : log.id)}
                  className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  View changes ({changedFields.length} field{changedFields.length > 1 ? 's' : ''})
                </button>
              )}
              {expanded && (
                <div className="mt-2 bg-gray-50 rounded border border-gray-200 text-xs overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-3 py-1.5 text-left text-gray-500 font-medium">Field</th>
                        <th className="px-3 py-1.5 text-left text-red-500 font-medium">Before</th>
                        <th className="px-3 py-1.5 text-left text-green-600 font-medium">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changedFields.map(field => (
                        <tr key={field} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-1 text-gray-700 font-mono">{field}</td>
                          <td className="px-3 py-1 text-red-600 font-mono">{JSON.stringify(prev?.[field])}</td>
                          <td className="px-3 py-1 text-green-700 font-mono">{JSON.stringify(next?.[field])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {logs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No audit entries found.</p>
      )}
    </div>
  );
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────

interface RuleFormProps {
  initial?: Partial<RemittanceRule>;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  isEdit?: boolean;
}

function RuleModal({ initial, onSave, onClose, isEdit }: RuleFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    from_level: initial?.from_level || 'local_church',
    to_level: initial?.to_level || 'section',
    fund_type: initial?.fund_type || 'tithes',
    rule_type: initial?.rule_type || 'percentage',
    percentage: initial?.percentage ?? '',
    fixed_amount: initial?.fixed_amount ?? '',
    minimum_amount: initial?.minimum_amount ?? '',
    maximum_amount: initial?.maximum_amount ?? '',
    frequency: initial?.frequency || 'monthly',
    effective_from: initial?.effective_from || new Date().toISOString().slice(0, 10),
    effective_to: initial?.effective_to || '',
    scope_entity_type: initial?.scope_entity_type || 'section',
    scope_entity_id: initial?.scope_entity_id || 1,
    requires_dual_auth: initial?.requires_dual_auth || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        ...form,
        percentage: form.percentage !== '' ? Number(form.percentage) : null,
        fixed_amount: form.fixed_amount !== '' ? Number(form.fixed_amount) : null,
        minimum_amount: form.minimum_amount !== '' ? Number(form.minimum_amount) : null,
        maximum_amount: form.maximum_amount !== '' ? Number(form.maximum_amount) : null,
        scope_entity_id: Number(form.scope_entity_id),
        effective_to: form.effective_to || null,
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-navy-900">{isEdit ? 'Edit Rule' : 'Create Remittance Rule'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input required value={form.name} onChange={set('name')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Level</label>
              <select value={form.from_level} onChange={set('from_level')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {LEVELS.slice(0, 3).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Level</label>
              <select value={form.to_level} onChange={set('to_level')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {LEVELS.slice(1).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fund Type</label>
              <select value={form.fund_type} onChange={set('fund_type')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {FUND_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select value={form.frequency} onChange={set('frequency')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Rule Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {RULE_TYPES.map(rt => (
                <button key={rt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, rule_type: rt.value }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.rule_type === rt.value
                    ? 'bg-navy-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}>
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic fields */}
          <div className="grid grid-cols-2 gap-4">
            {(form.rule_type === 'percentage' || form.rule_type === 'hybrid') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={form.percentage} onChange={set('percentage')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 15" />
              </div>
            )}
            {form.rule_type === 'fixed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Amount (₦)</label>
                <input type="number" min="0" step="0.01" value={form.fixed_amount} onChange={set('fixed_amount')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 2000" />
              </div>
            )}
            {form.rule_type === 'hybrid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount (₦)</label>
                <input type="number" min="0" step="0.01" value={form.minimum_amount} onChange={set('minimum_amount')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 2000" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount (₦) — optional cap</label>
              <input type="number" min="0" step="0.01" value={form.maximum_amount} onChange={set('maximum_amount')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Leave blank for no cap" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope Entity Type</label>
              <select value={form.scope_entity_type} onChange={set('scope_entity_type')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="general_council">General Council</option>
                <option value="district">District</option>
                <option value="section">Section</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope Entity ID</label>
              <input type="number" min="1" value={form.scope_entity_id} onChange={set('scope_entity_id')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
              <input type="date" required value={form.effective_from} onChange={set('effective_from')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective To (optional)</label>
              <input type="date" value={form.effective_to} onChange={set('effective_to')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <input type="checkbox" id="dual_auth" checked={form.requires_dual_auth}
              onChange={e => setForm(f => ({ ...f, requires_dual_auth: e.target.checked }))}
              className="w-4 h-4 rounded" />
            <label htmlFor="dual_auth" className="flex items-center gap-2 text-sm text-amber-800 cursor-pointer">
              <Shield size={16} className="text-amber-600" />
              Require dual authorization (two separate approvers)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-navy-900 text-white rounded-lg hover:bg-navy-800 disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Audit Drawer ──────────────────────────────────────────────────────────────

function AuditDrawer({ rule, onClose }: { rule: RemittanceRule; onClose: () => void }) {
  const [logs, setLogs] = useState<RemittanceRuleAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRemittanceRuleAuditLog(rule.id).then(setLogs).finally(() => setLoading(false));
  }, [rule.id]);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-navy-900 text-white">
        <div>
          <h3 className="font-bold text-sm">Audit Trail</h3>
          <p className="text-xs text-navy-300 mt-0.5">{rule.name}</p>
        </div>
        <button onClick={onClose} className="text-navy-300 hover:text-white"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading audit trail...</div>
        ) : (
          <AuditTimeline logs={logs} />
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function RemittanceRules({ currentUser }: Props) {
  const [rules, setRules] = useState<RemittanceRule[]>([]);
  const [allLogs, setAllLogs] = useState<RemittanceRuleAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'feed'>('rules');
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<RemittanceRule | null>(null);
  const [auditRule, setAuditRule] = useState<RemittanceRule | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFund, setFilterFund] = useState('');

  const canAdmin = ['general_council_admin', 'district_admin', 'section_admin'].includes(currentUser.role);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterFund) params.fund_type = filterFund;
      const data = await listRemittanceRules(params);
      setRules(data);
    } catch {
      setError('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterFund]);

  const loadAllLogs = useCallback(async () => {
    try {
      const data = await getAllRemittanceAuditLogs();
      setAllLogs(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);
  useEffect(() => { if (activeTab === 'feed') loadAllLogs(); }, [activeTab, loadAllLogs]);

  const doAction = async (action: () => Promise<any>, ruleId: number) => {
    setActionLoading(ruleId);
    setError(null);
    try {
      await action();
      await loadRules();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Remittance Rules</h1>
          <p className="text-sm text-gray-500 mt-1">Configurable rules governing fund remittances across the hierarchy</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadRules} className="p-2 text-gray-500 hover:text-navy-900 rounded-lg hover:bg-gray-100">
            <RefreshCw size={16} />
          </button>
          {canAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 text-sm font-medium">
              <Plus size={16} /> New Rule
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('rules')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'rules' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-600 hover:text-navy-900'}`}>
          Rules
        </button>
        <button onClick={() => setActiveTab('feed')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'feed' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-600 hover:text-navy-900'}`}>
          Global Audit Feed
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {activeTab === 'rules' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="active">Active</option>
              <option value="superseded">Superseded</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={filterFund} onChange={e => setFilterFund(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="">All Fund Types</option>
              {FUND_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          {/* Rules Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Activity size={40} className="mx-auto mb-3 opacity-30" />
              <p>No remittance rules found.</p>
              {canAdmin && <p className="text-sm mt-1">Create your first rule to get started.</p>}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Formula</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-navy-900">{rule.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {rule.from_level.replace('_', ' ')} → {rule.to_level.replace('_', ' ')}
                          {rule.requires_dual_auth && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-amber-700">
                              <Shield size={10} /> Dual Auth
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatFormula(rule)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 capitalize">
                          {rule.scope_entity_type.replace('_', ' ')} #{rule.scope_entity_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={rule.status} />
                        {rule.status === 'pending_approval' && rule.requires_dual_auth && rule.approved_by_id && !rule.second_approver_id && (
                          <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Clock size={10} /> Awaiting 2nd approval
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {rule.effective_from}
                        {rule.effective_to && <> – {rule.effective_to}</>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={() => setAuditRule(rule)}
                            className="p-1.5 text-gray-400 hover:text-navy-900 rounded hover:bg-gray-100" title="Audit trail">
                            <History size={14} />
                          </button>
                          {canAdmin && rule.status === 'draft' && (
                            <>
                              <button onClick={() => setEditingRule(rule)}
                                className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                                Edit
                              </button>
                              <button onClick={() => doAction(() => submitRemittanceRule(rule.id), rule.id)}
                                disabled={actionLoading === rule.id}
                                className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50">
                                Submit
                              </button>
                            </>
                          )}
                          {canAdmin && rule.status === 'pending_approval' && !rule.approved_by_id && (
                            <button onClick={() => doAction(() => approveRemittanceRule(rule.id), rule.id)}
                              disabled={actionLoading === rule.id}
                              className="px-2 py-1 text-xs text-green-600 border border-green-300 rounded hover:bg-green-50 disabled:opacity-50">
                              Approve
                            </button>
                          )}
                          {canAdmin && rule.status === 'pending_approval' && rule.requires_dual_auth && rule.approved_by_id && !rule.second_approver_id && (
                            <button onClick={() => doAction(() => secondApproveRemittanceRule(rule.id), rule.id)}
                              disabled={actionLoading === rule.id}
                              className="px-2 py-1 text-xs text-green-600 border border-green-300 rounded hover:bg-green-50 disabled:opacity-50 flex items-center gap-1">
                              <Shield size={10} /> 2nd Approve
                            </button>
                          )}
                          {canAdmin && rule.status === 'pending_approval' && (
                            <button onClick={() => doAction(() => rejectRemittanceRule(rule.id), rule.id)}
                              disabled={actionLoading === rule.id}
                              className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50">
                              Reject
                            </button>
                          )}
                          {canAdmin && rule.status === 'active' && (
                            <button onClick={() => doAction(() => deactivateRemittanceRule(rule.id), rule.id)}
                              disabled={actionLoading === rule.id}
                              className="px-2 py-1 text-xs text-orange-600 border border-orange-300 rounded hover:bg-orange-50 disabled:opacity-50">
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'feed' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy-900 flex items-center gap-2">
              <Activity size={16} /> Global Audit Feed
            </h2>
            <button onClick={loadAllLogs} className="text-xs text-gray-500 hover:text-navy-900 flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <AuditTimeline logs={allLogs} />
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <RuleModal
          onSave={data => createRemittanceRule(data).then(() => {})}
          onClose={() => { setShowCreate(false); loadRules(); }}
        />
      )}
      {editingRule && (
        <RuleModal
          initial={editingRule}
          isEdit
          onSave={data => updateRemittanceRule(editingRule.id, data).then(() => {})}
          onClose={() => { setEditingRule(null); loadRules(); }}
        />
      )}
      {auditRule && (
        <AuditDrawer rule={auditRule} onClose={() => setAuditRule(null)} />
      )}
    </div>
  );
}
