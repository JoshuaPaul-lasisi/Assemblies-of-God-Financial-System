import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import type { Transaction } from '../types';

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  allocation: 'Financial Allocation',
  payment: 'Payment',
  remittance: 'Remittance',
  expense: 'Expense',
};

export function ReceiptModal({ transaction: tx, onClose }: Props) {
  if (!tx) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-navy-900 text-white rounded-t-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-gold-500 text-xs font-medium uppercase tracking-wide">Official Receipt</div>
              <div className="text-lg font-bold mt-1">Assemblies of God</div>
              <div className="text-navy-300 text-xs">Financial System</div>
            </div>
            <button onClick={onClose} className="text-navy-300 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt content */}
        <div className="p-5">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-navy-900 font-mono">{tx.receipt_number}</div>
            <div className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${
              tx.status === 'completed' ? 'bg-green-100 text-green-700' :
              tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              tx.status === 'approved' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {tx.status.toUpperCase()}
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Transaction Type</span>
              <span className="font-medium">{typeLabels[tx.transaction_type] || tx.transaction_type}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-navy-900 text-lg">
                ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {tx.from_entity_type && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">From</span>
                <span className="font-medium capitalize">{tx.from_entity_type.replace('_', ' ')} #{tx.from_entity_id}</span>
              </div>
            )}
            {tx.to_entity_type && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">To</span>
                <span className="font-medium capitalize">{tx.to_entity_type.replace('_', ' ')} #{tx.to_entity_id}</span>
              </div>
            )}
            {tx.description && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Description</span>
                <span className="font-medium text-right max-w-[60%]">{tx.description}</span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{new Date(tx.created_at).toLocaleString()}</span>
            </div>
            {tx.approved_by && (
              <div className="flex justify-between">
                <span className="text-gray-500">Approved By</span>
                <span className="font-medium">User #{tx.approved_by}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-dashed text-center text-xs text-gray-400">
            <div>Assemblies of God Financial System</div>
            <div>This is an official financial receipt</div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-navy-100 text-navy-700 py-2 rounded-lg hover:bg-navy-200 transition-colors text-sm font-medium"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-navy-900 text-white py-2 rounded-lg hover:bg-navy-800 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
