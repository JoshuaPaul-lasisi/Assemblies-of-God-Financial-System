import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import type { Transaction } from '../types';

interface Props {
  transaction: Transaction;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onComplete?: (id: number) => void;
  canApprove?: boolean;
  onClick?: () => void;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Approved' },
  completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Completed' },
  rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' },
};

const typeColors: Record<string, string> = {
  allocation: 'bg-purple-100 text-purple-700',
  payment: 'bg-blue-100 text-blue-700',
  remittance: 'bg-indigo-100 text-indigo-700',
  expense: 'bg-orange-100 text-orange-700',
};

export function TransactionCard({ transaction: tx, onApprove, onReject, onComplete, canApprove, onClick }: Props) {
  const status = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div
      className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[tx.transaction_type] || 'bg-gray-100 text-gray-600'}`}>
              {tx.transaction_type}
            </span>
            <span className="text-xs text-gray-400">{tx.receipt_number}</span>
          </div>
          <div className="mt-1 font-semibold text-navy-900 text-lg">
            ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          {(tx.from_entity_type || tx.to_entity_type) && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <span className="capitalize">{tx.from_entity_type?.replace('_', ' ') || '—'}</span>
              {tx.to_entity_type && (
                <>
                  <ArrowRight size={10} />
                  <span className="capitalize">{tx.to_entity_type.replace('_', ' ')}</span>
                </>
              )}
            </div>
          )}
          {tx.description && (
            <p className="text-xs text-gray-500 mt-1 truncate">{tx.description}</p>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${status.bg} ${status.color} ${status.border} border`}>
          <StatusIcon size={12} />
          {status.label}
        </div>
      </div>

      {canApprove && tx.status === 'pending' && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onApprove?.(tx.id)}
            className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded hover:bg-green-700 transition-colors font-medium"
          >
            Approve
          </button>
          <button
            onClick={() => onReject?.(tx.id)}
            className="flex-1 bg-red-600 text-white text-xs py-1.5 rounded hover:bg-red-700 transition-colors font-medium"
          >
            Reject
          </button>
        </div>
      )}
      {canApprove && tx.status === 'approved' && (
        <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onComplete?.(tx.id)}
            className="w-full bg-navy-700 text-white text-xs py-1.5 rounded hover:bg-navy-800 transition-colors font-medium"
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}
