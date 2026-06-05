import React, { useEffect, useState } from 'react';
import { Plus, Filter, RefreshCw, X } from 'lucide-react';
import { listTransactions, createTransaction, approveTransaction, rejectTransaction, completeTransaction } from '../api';
import { TransactionCard } from '../components/TransactionCard';
import { ReceiptModal } from '../components/ReceiptModal';
import type { Transaction } from '../types';

interface Props {
  canApprove?: boolean;
  wsMessage?: any;
}

const TYPES = ['', 'allocation', 'payment', 'remittance', 'expense'];
const STATUSES = ['', 'pending', 'approved', 'completed', 'rejected'];

export function TransactionsPage({ canApprove, wsMessage }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', transaction_type: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<any>({
    transaction_type: 'allocation',
    amount: '',
    from_entity_type: 'local_church',
    from_entity_id: '',
    to_entity_type: 'section',
    to_entity_id: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      const data = await listTransactions(params);
      setTransactions(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  useEffect(() => {
    if (wsMessage?.type?.includes('transaction')) load();
  }, [wsMessage]);

  const handleApprove = async (id: number) => {
    await approveTransaction(id);
    load();
  };

  const handleReject = async (id: number) => {
    await rejectTransaction(id);
    load();
  };

  const handleComplete = async (id: number) => {
    await completeTransaction(id);
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createTransaction({
        ...form,
        amount: parseFloat(form.amount),
        from_entity_id: form.from_entity_id ? parseInt(form.from_entity_id) : null,
        to_entity_id: form.to_entity_id ? parseInt(form.to_entity_id) : null,
      });
      setShowCreate(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Transactions</h1>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:text-navy-700 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-700 text-sm font-medium"
          >
            <Plus size={16} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={14} />
          Filters:
        </div>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select
          value={filters.transaction_type}
          onChange={e => setFilters(f => ({ ...f, transaction_type: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
        >
          {TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
        </select>
        {(filters.status || filters.transaction_type) && (
          <button
            onClick={() => setFilters({ status: '', transaction_type: '' })}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 bg-red-50 rounded-lg"
          >
            <X size={12} />
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">{transactions.length} transactions</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-700" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transactions.map(tx => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              onApprove={handleApprove}
              onReject={handleReject}
              onComplete={handleComplete}
              canApprove={canApprove}
              onClick={() => setSelectedTx(tx)}
            />
          ))}
          {transactions.length === 0 && (
            <div className="col-span-3 text-center text-gray-400 py-16">
              No transactions found
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />

      {/* Create Transaction Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy-900">New Transaction</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={form.transaction_type}
                    onChange={e => setForm({ ...form, transaction_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  >
                    {['allocation', 'payment', 'remittance', 'expense'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Entity Type</label>
                  <select
                    value={form.from_entity_type}
                    onChange={e => setForm({ ...form, from_entity_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  >
                    {['local_church', 'section', 'district', 'general_council'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Entity ID</label>
                  <input
                    type="number"
                    value={form.from_entity_id}
                    onChange={e => setForm({ ...form, from_entity_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    placeholder="Entity ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Entity Type</label>
                  <select
                    value={form.to_entity_type}
                    onChange={e => setForm({ ...form, to_entity_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  >
                    <option value="">-- None --</option>
                    {['local_church', 'section', 'district', 'general_council'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Entity ID</label>
                  <input
                    type="number"
                    value={form.to_entity_id}
                    onChange={e => setForm({ ...form, to_entity_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    placeholder="Entity ID"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                <strong>Delegation Rules:</strong> Transactions under $10,000 are auto-approved. $10K-$50K requires Section approval. $50K-$200K requires District. Over $200K requires General Council.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-navy-800 text-white py-2 rounded-lg hover:bg-navy-700 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
