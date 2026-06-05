import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X, Shield, Layers } from 'lucide-react';
import {
  listAllocationRules, createAllocationRule, deleteAllocationRule,
  listDelegationRules, createDelegationRule, deleteDelegationRule
} from '../api';
import type { AllocationRule, DelegationRule } from '../types';

interface Props {
  canEdit?: boolean;
}

const LEVELS = ['local_church', 'section', 'district', 'general_council'];

export function AllocationsPage({ canEdit }: Props) {
  const [allocationRules, setAllocationRules] = useState<AllocationRule[]>([]);
  const [delegationRules, setDelegationRules] = useState<DelegationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAllocation, setShowAddAllocation] = useState(false);
  const [showAddDelegation, setShowAddDelegation] = useState(false);
  const [allocForm, setAllocForm] = useState<any>({ name: '', level: 'local_church', amount: '', description: '', is_fixed: true });
  const [delegForm, setDelegForm] = useState<any>({ name: '', level: 'local_church', min_amount: '', max_amount: '', requires_approval_from: 'section' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [alloc, deleg] = await Promise.all([listAllocationRules(), listDelegationRules()]);
      setAllocationRules(alloc);
      setDelegationRules(deleg);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDeleteAlloc = async (id: number) => {
    if (!confirm('Delete this allocation rule?')) return;
    await deleteAllocationRule(id);
    load();
  };

  const handleDeleteDeleg = async (id: number) => {
    if (!confirm('Delete this delegation rule?')) return;
    await deleteDelegationRule(id);
    load();
  };

  const handleCreateAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAllocationRule({ ...allocForm, amount: parseFloat(allocForm.amount) });
      setShowAddAllocation(false);
      load();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleCreateDeleg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createDelegationRule({
        ...delegForm,
        min_amount: parseFloat(delegForm.min_amount),
        max_amount: delegForm.max_amount ? parseFloat(delegForm.max_amount) : null,
      });
      setShowAddDelegation(false);
      load();
    } catch {} finally {
      setSaving(false);
    }
  };

  const levelColors: Record<string, string> = {
    local_church: 'bg-purple-100 text-purple-700',
    section: 'bg-indigo-100 text-indigo-700',
    district: 'bg-blue-100 text-blue-700',
    general_council: 'bg-navy-100 text-navy-700',
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy-900">Allocations & Delegation Rules</h1>

      {/* Allocation Rules */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-navy-700" />
            <h2 className="font-semibold text-navy-900">Allocation Rules</h2>
            <span className="bg-navy-100 text-navy-700 text-xs px-2 py-0.5 rounded-full">{allocationRules.length}</span>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddAllocation(true)}
              className="flex items-center gap-1.5 text-sm bg-navy-800 text-white px-3 py-1.5 rounded-lg hover:bg-navy-700"
            >
              <Plus size={14} />
              Add Rule
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allocationRules.map(rule => (
              <div key={rule.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-navy-900">{rule.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[rule.level] || 'bg-gray-100 text-gray-600'}`}>
                      {rule.level.replace('_', ' ')}
                    </span>
                    {rule.is_fixed && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Fixed</span>
                    )}
                  </div>
                  {rule.description && <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>}
                </div>
                <span className="font-bold text-lg text-navy-900">${rule.amount.toLocaleString()}</span>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteAlloc(rule.id)}
                    className="text-gray-300 hover:text-red-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {allocationRules.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">No allocation rules configured</div>
            )}
          </div>
        )}
      </div>

      {/* Delegation Rules */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-navy-700" />
            <h2 className="font-semibold text-navy-900">Delegation Rules</h2>
            <span className="bg-navy-100 text-navy-700 text-xs px-2 py-0.5 rounded-full">{delegationRules.length}</span>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddDelegation(true)}
              className="flex items-center gap-1.5 text-sm bg-navy-800 text-white px-3 py-1.5 rounded-lg hover:bg-navy-700"
            >
              <Plus size={14} />
              Add Rule
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {delegationRules.map(rule => (
            <div key={rule.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-navy-900">{rule.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[rule.level] || 'bg-gray-100 text-gray-600'}`}>
                    {rule.level.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Amount: ${rule.min_amount.toLocaleString()} – {rule.max_amount ? `$${rule.max_amount.toLocaleString()}` : 'unlimited'}
                  {' · '} Requires: <span className="font-medium capitalize">{rule.requires_approval_from.replace('_', ' ')} approval</span>
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDeleteDeleg(rule.id)}
                  className="text-gray-300 hover:text-red-500 p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {delegationRules.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">No delegation rules configured</div>
          )}
        </div>
      </div>

      {/* Add Allocation Modal */}
      {showAddAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Allocation Rule</h2>
              <button onClick={() => setShowAddAllocation(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAlloc} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={allocForm.name} onChange={e => setAllocForm({ ...allocForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
                  <select value={allocForm.level} onChange={e => setAllocForm({ ...allocForm, level: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">
                    {LEVELS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
                  <input type="number" step="0.01" value={allocForm.amount} onChange={e => setAllocForm({ ...allocForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={allocForm.description} onChange={e => setAllocForm({ ...allocForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_fixed" checked={allocForm.is_fixed} onChange={e => setAllocForm({ ...allocForm, is_fixed: e.target.checked })} />
                <label htmlFor="is_fixed" className="text-sm text-gray-700">Fixed Amount</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddAllocation(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-800 text-white py-2 rounded-lg text-sm disabled:opacity-60">
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Delegation Modal */}
      {showAddDelegation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Delegation Rule</h2>
              <button onClick={() => setShowAddDelegation(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateDeleg} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={delegForm.name} onChange={e => setDelegForm({ ...delegForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
                  <select value={delegForm.level} onChange={e => setDelegForm({ ...delegForm, level: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">
                    {LEVELS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Requires Approval From</label>
                  <select value={delegForm.requires_approval_from} onChange={e => setDelegForm({ ...delegForm, requires_approval_from: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">
                    <option value="auto">Auto (no approval)</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Amount *</label>
                  <input type="number" step="0.01" value={delegForm.min_amount} onChange={e => setDelegForm({ ...delegForm, min_amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Amount</label>
                  <input type="number" step="0.01" value={delegForm.max_amount} onChange={e => setDelegForm({ ...delegForm, max_amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    placeholder="Leave blank for unlimited" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddDelegation(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-800 text-white py-2 rounded-lg text-sm disabled:opacity-60">
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
