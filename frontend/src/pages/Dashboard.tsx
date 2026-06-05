import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Clock, CheckCircle, DollarSign, Building2, Map, Layers, Church } from 'lucide-react';
import { getDashboardStats } from '../api';
import type { DashboardStats } from '../types';

const PIE_COLORS = ['#1e3a5f', '#d4af37', '#486581', '#334e68'];

interface Props {
  wsMessage?: any;
}

export function Dashboard({ wsMessage }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (wsMessage?.type?.includes('transaction')) {
      load();
    }
  }, [wsMessage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-700" />
      </div>
    );
  }

  if (!stats) return null;

  const pieData = Object.entries(stats.type_breakdown).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val.amount,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Financial Dashboard</h1>
        <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Transactions',
            value: stats.total_transactions.toLocaleString(),
            icon: TrendingUp,
            color: 'bg-navy-700 text-white',
          },
          {
            label: 'Total Volume',
            value: `$${(stats.total_amount / 1000).toFixed(1)}K`,
            icon: DollarSign,
            color: 'bg-gold-500 text-navy-900',
          },
          {
            label: 'Pending Approval',
            value: stats.pending_transactions.toLocaleString(),
            icon: Clock,
            color: stats.pending_transactions > 0 ? 'bg-yellow-500 text-white' : 'bg-green-600 text-white',
          },
          {
            label: 'Completed',
            value: stats.completed_transactions.toLocaleString(),
            icon: CheckCircle,
            color: 'bg-green-600 text-white',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl p-5 shadow-sm ${color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
              </div>
              <Icon size={28} className="opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Income vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-navy-900 mb-1">This Month</h3>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Income</p>
              <p className="text-xl font-bold text-green-700">${stats.monthly_income.toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium">Expenses</p>
              <p className="text-xl font-bold text-red-700">${stats.monthly_expenses.toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
            </div>
          </div>
          <div className="mt-3 bg-navy-50 rounded-lg p-3">
            <p className="text-xs text-navy-600 font-medium">Net</p>
            <p className="text-xl font-bold text-navy-800">
              ${(stats.monthly_income - stats.monthly_expenses).toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Hierarchy summary */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-navy-900 mb-3">Organization Overview</h3>
          <div className="space-y-2">
            {[
              { label: 'General Councils', count: stats.hierarchy_breakdown.general_councils, icon: Building2, color: 'text-navy-700 bg-navy-100' },
              { label: 'Districts', count: stats.hierarchy_breakdown.districts, icon: Map, color: 'text-blue-700 bg-blue-100' },
              { label: 'Sections', count: stats.hierarchy_breakdown.sections, icon: Layers, color: 'text-indigo-700 bg-indigo-100' },
              { label: 'Local Churches', count: stats.hierarchy_breakdown.churches, icon: Church, color: 'text-purple-700 bg-purple-100' },
            ].map(({ label, count, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
                <span className="font-semibold text-navy-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-navy-900 mb-4">6-Month Transaction Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthly_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Amount']} />
              <Bar dataKey="amount" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-navy-900 mb-4">By Transaction Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={false}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Amount']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-navy-900">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.recent_transactions.slice(0, 8).map((tx: any) => (
            <div key={tx.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                tx.transaction_type === 'allocation' ? 'bg-purple-100 text-purple-700' :
                tx.transaction_type === 'remittance' ? 'bg-indigo-100 text-indigo-700' :
                tx.transaction_type === 'expense' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {tx.transaction_type}
              </span>
              <span className="text-xs text-gray-400 font-mono">{tx.receipt_number}</span>
              <span className="flex-1 text-sm text-gray-600 truncate capitalize">
                {tx.from_entity_type?.replace('_', ' ')} → {tx.to_entity_type?.replace('_', ' ')}
              </span>
              <span className="font-semibold text-sm text-navy-900">${tx.amount.toLocaleString()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                tx.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {tx.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
