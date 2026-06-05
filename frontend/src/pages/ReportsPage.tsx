import React, { useEffect, useState } from 'react';
import { Plus, Download, FileText, X, BarChart2 } from 'lucide-react';
import { listReports, createReport, getMonthlySummary } from '../api';
import { BASE_URL } from '../api/client';
import type { Report } from '../types';

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    report_type: 'monthly_summary',
    entity_type: '',
    entity_id: '',
    period_start: '',
    period_end: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [rpts, sum] = await Promise.all([listReports(), getMonthlySummary()]);
      setReports(rpts);
      setSummary(sum);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createReport({
        ...form,
        entity_id: form.entity_id ? parseInt(form.entity_id) : null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        entity_type: form.entity_type || null,
      });
      setShowCreate(false);
      load();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDownload = (report: Report) => {
    if (!report.file_path) {
      alert('Report file not available');
      return;
    }
    const token = localStorage.getItem('token');
    window.open(`${BASE_URL}/api/reports/${report.id}/download`, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-navy-700" />
          <h1 className="text-2xl font-bold text-navy-900">Reports</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-700 text-sm font-medium"
        >
          <Plus size={16} />
          Generate Report
        </button>
      </div>

      {/* Monthly Summary */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-navy-700" />
            <h2 className="font-semibold text-navy-900">Current Month Summary</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.summary || {}).map(([type, data]: [string, any]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 capitalize">{type}</p>
                <p className="text-xl font-bold text-navy-900 mt-1">${data.amount?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 0}</p>
                <p className="text-xs text-gray-400">{data.count} transactions</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-6 text-sm">
            <span className="text-gray-500">Total: <strong className="text-navy-900">{summary.total_transactions}</strong> transactions</span>
            <span className="text-gray-500">Volume: <strong className="text-navy-900">${summary.total_amount?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-navy-900">Generated Reports</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map(report => (
              <div key={report.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-navy-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-navy-900">{report.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <span className="capitalize">{report.report_type.replace('_', ' ')}</span>
                    {report.entity_type && <> · {report.entity_type.replace('_', ' ')}</>}
                    {(report.period_start || report.period_end) && (
                      <> · {report.period_start ? new Date(report.period_start).toLocaleDateString() : '?'} – {report.period_end ? new Date(report.period_end).toLocaleDateString() : '?'}</>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">Generated {new Date(report.created_at).toLocaleString()}</div>
                </div>
                {report.file_path ? (
                  <button
                    onClick={() => handleDownload(report)}
                    className="flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-900 px-3 py-1.5 border border-navy-200 rounded-lg hover:bg-navy-50"
                  >
                    <Download size={14} />
                    PDF
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">No file</span>
                )}
              </div>
            ))}
            {reports.length === 0 && (
              <div className="text-center text-gray-400 py-12 text-sm">No reports generated yet</div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Generate Report</h2>
              <button onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Report Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="e.g. Monthly Financial Summary - June 2026" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Report Type</label>
                <select value={form.report_type} onChange={e => setForm({ ...form, report_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">
                  <option value="monthly_summary">Monthly Summary</option>
                  <option value="annual_statement">Annual Statement</option>
                  <option value="remittance_report">Remittance Report</option>
                  <option value="detailed_transactions">Detailed Transactions</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
                  <select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">
                    <option value="">All</option>
                    <option value="local_church">Local Church</option>
                    <option value="section">Section</option>
                    <option value="district">District</option>
                    <option value="general_council">General Council</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Entity ID</label>
                  <input type="number" value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    placeholder="Leave blank for all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
                  <input type="date" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period End</label>
                  <input type="date" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-800 text-white py-2 rounded-lg text-sm disabled:opacity-60">
                  {saving ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
