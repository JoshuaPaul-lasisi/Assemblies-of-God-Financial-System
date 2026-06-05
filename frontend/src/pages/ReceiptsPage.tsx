import React, { useEffect, useState } from 'react';
import { Search, Receipt } from 'lucide-react';
import { listTransactions } from '../api';
import { ReceiptModal } from '../components/ReceiptModal';
import type { Transaction } from '../types';

export function ReceiptsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => {
    listTransactions({ limit: 200 }).then(setTransactions).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(tx =>
    !search || tx.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    tx.description?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved') return 'bg-blue-100 text-blue-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Receipt size={24} className="text-navy-700" />
          <h1 className="text-2xl font-bold text-navy-900">Receipts</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by receipt number or description..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading receipts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">From → To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(tx)}>
                    <td className="px-4 py-3 text-sm font-mono text-navy-700 font-medium">{tx.receipt_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tx.transaction_type === 'allocation' ? 'bg-purple-100 text-purple-700' :
                        tx.transaction_type === 'remittance' ? 'bg-indigo-100 text-indigo-700' :
                        tx.transaction_type === 'expense' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-900 text-sm">
                      ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span className="capitalize">{tx.from_entity_type?.replace('_', ' ') || '—'}</span>
                      {tx.to_entity_type && <> → <span className="capitalize">{tx.to_entity_type.replace('_', ' ')}</span></>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(tx); }}
                        className="text-xs text-navy-600 hover:text-navy-900 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-8 text-sm">No receipts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReceiptModal transaction={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
