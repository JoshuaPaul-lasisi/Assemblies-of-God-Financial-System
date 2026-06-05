import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Plus, Lock, Unlock, Edit2, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import { getUsers, toggleUserActive, updateUser, deleteUser, createUser } from '../api';
import type { User } from '../types';

interface Props {
  currentUser: User;
}

const ROLES = [
  { value: 'general_council_admin', label: 'GC Admin', color: '#7c3aed' },
  { value: 'district_admin', label: 'District Admin', color: '#1d4ed8' },
  { value: 'section_admin', label: 'Section Admin', color: '#0369a1' },
  { value: 'church_admin', label: 'Church Admin', color: '#047857' },
  { value: 'viewer', label: 'Viewer', color: '#374151' },
];

const HIERARCHY_LEVELS = [
  { value: 'general_council', label: 'General Council' },
  { value: 'district', label: 'District' },
  { value: 'section', label: 'Section' },
  { value: 'local_church', label: 'Local Church' },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.value === role);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: r?.color || '#374151' }}
    >
      {r?.label || role}
    </span>
  );
}

function UserInitials({ username }: { username: string }) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
      style={{ backgroundColor: '#003087' }}
    >
      {initials}
    </div>
  );
}

interface ConfirmDialogProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
}

function LockConfirmDialog({ user, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef2f2' }}>
            <AlertTriangle size={20} style={{ color: '#dc2626' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Lock out {user.username}?</h3>
            <p className="text-sm text-gray-500">
              They will immediately lose access even with an active session. You can unlock them at any time.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#dc2626' }}
          >
            Lock User
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddUserModalProps {
  onClose: () => void;
  onCreated: (user: User) => void;
}

function AddUserModal({ onClose, onCreated }: AddUserModalProps) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer',
    hierarchy_level: 'local_church',
    entity_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await createUser({
        ...form,
        entity_id: form.entity_id ? parseInt(form.entity_id) : undefined,
      });
      onCreated(created);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderBottomColor: '#FFD700', borderBottomWidth: 2 }}>
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#003087' }}>Add New User</h2>
            <p className="text-xs text-gray-500">Create a new system user account</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. john_doe"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hierarchy Level *</label>
              <select
                value={form.hierarchy_level}
                onChange={e => setForm(f => ({ ...f, hierarchy_level: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HIERARCHY_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity ID (optional)</label>
            <input
              type="number"
              value={form.entity_id}
              onChange={e => setForm(f => ({ ...f, entity_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Link to district/section/church ID"
            />
          </div>

          <div className="flex gap-3 pt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#003087' }}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserManagement({ currentUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [lockConfirm, setLockConfirm] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (user: User) => {
    if (user.is_active) {
      // Locking — show confirmation
      setLockConfirm(user);
    } else {
      // Unlocking — no confirmation needed
      await doToggle(user.id);
    }
  };

  const doToggle = async (userId: number) => {
    setLockConfirm(null);
    setActionLoading(userId);
    try {
      const updated = await toggleUserActive(userId);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Soft-delete ${user.username}? This will deactivate their account.`)) return;
    setActionLoading(user.id);
    try {
      const updated = await deleteUser(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserCreated = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
    setShowAddModal(false);
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus ||
      (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = users.filter(u => u.is_active).length;
  const lockedCount = users.filter(u => !u.is_active).length;

  if (currentUser.role !== 'general_council_admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        <Users size={48} className="mx-auto mb-4 opacity-30" />
        <p className="font-medium">Access Denied</p>
        <p className="text-sm mt-1">User Management is only available to General Council Admins.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={22} style={{ color: '#003087' }} />
            <h1 className="text-xl font-bold" style={{ color: '#003087' }}>User Management</h1>
          </div>
          <p className="text-sm text-gray-500">
            Manage system user accounts, roles, and access control
          </p>
          {!loading && (
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-gray-600">{activeCount} active</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span className="text-gray-600">{lockedCount} locked</span>
              </span>
              <span className="text-gray-400">{users.length} total</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#003087' }}
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Roles</option>
          {ROLES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
        </select>
        {(search || filterRole || filterStatus) && (
          <button
            onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}
            className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Loading users...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: '#f8fafc' }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Hierarchy</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Created</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <Users size={36} className="mx-auto mb-2 opacity-30" />
                      <p>No users found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(u => {
                    const isSelf = u.id === currentUser.id;
                    const isLoading = actionLoading === u.id;
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        style={!u.is_active ? { opacity: 0.7 } : undefined}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserInitials username={u.username} />
                            <div>
                              <div className="font-medium text-gray-900 flex items-center gap-1">
                                {u.username}
                                {isSelf && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-normal">You</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600 capitalize text-xs">
                            {u.hierarchy_level?.replace('_', ' ')}
                            {u.entity_id ? <span className="text-gray-400"> #{u.entity_id}</span> : null}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <Check size={10} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <Lock size={10} /> Locked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Lock / Unlock */}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleActive(u)}
                                disabled={isLoading}
                                title={u.is_active ? 'Lock user' : 'Unlock user'}
                                className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                                style={u.is_active
                                  ? { color: '#dc2626', backgroundColor: 'transparent' }
                                  : { color: '#16a34a', backgroundColor: 'transparent' }
                                }
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = u.is_active ? '#fef2f2' : '#f0fdf4'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                              >
                                {isLoading ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : u.is_active ? (
                                  <Lock size={15} />
                                ) : (
                                  <Unlock size={15} />
                                )}
                              </button>
                            )}
                            {/* Soft Delete */}
                            {!isSelf && u.is_active && (
                              <button
                                onClick={() => handleDelete(u)}
                                disabled={isLoading}
                                title="Deactivate (soft delete)"
                                className="p-1.5 rounded-lg transition-colors disabled:opacity-50 text-gray-400"
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fef2f2'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                            {isSelf && (
                              <span className="text-xs text-gray-400 pr-2">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {users.length} users
            </div>
          )}
        </div>
      )}

      {/* Lock Confirm Dialog */}
      {lockConfirm && (
        <LockConfirmDialog
          user={lockConfirm}
          onConfirm={() => doToggle(lockConfirm.id)}
          onCancel={() => setLockConfirm(null)}
        />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleUserCreated}
        />
      )}
    </div>
  );
}
