import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Network, ArrowLeftRight, Layers,
  FileText, Receipt, Bell, LogOut, GitMerge, Users
} from 'lucide-react';
import type { User } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
  notificationCount?: number;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
  { to: '/hierarchy', icon: Network, label: 'Hierarchy', adminOnly: false },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions', adminOnly: false },
  { to: '/allocations', icon: Layers, label: 'Allocations', adminOnly: false },
  { to: '/remittance-rules', icon: GitMerge, label: 'Remittance Rules', adminOnly: false },
  { to: '/receipts', icon: Receipt, label: 'Receipts', adminOnly: false },
  { to: '/reports', icon: FileText, label: 'Reports', adminOnly: false },
  { to: '/notifications', icon: Bell, label: 'Notifications', adminOnly: false },
  { to: '/users', icon: Users, label: 'User Management', adminOnly: true },
];

const roleLabels: Record<string, string> = {
  general_council_admin: 'GC Admin',
  district_admin: 'District Admin',
  section_admin: 'Section Admin',
  church_admin: 'Church Admin',
  viewer: 'Viewer',
};

export function Sidebar({ user, onLogout, notificationCount = 0 }: Props) {
  const isAdmin = user.role === 'general_council_admin';

  return (
    <div className="h-full flex flex-col text-white w-64 min-w-[256px]" style={{ backgroundColor: '#003087' }}>
      {/* AG Logo Header */}
      <div className="border-b" style={{ borderColor: 'rgba(255,215,0,0.3)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <img
            src="/ag-logo.svg"
            alt="AG Logo"
            style={{ height: '44px', width: 'auto', flexShrink: 0 }}
          />
          <div>
            <div className="font-black text-xs leading-tight tracking-wide uppercase" style={{ color: '#FFD700' }}>
              Assemblies of God
            </div>
            <div className="text-xs leading-tight" style={{ color: 'rgba(192,207,232,0.8)' }}>
              Financial System
            </div>
          </div>
        </div>
        {/* Gold accent line */}
        <div className="h-0.5 mx-4 mb-0" style={{ backgroundColor: '#FFD700', opacity: 0.6 }} />
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,215,0,0.2)' }}>
        <div className="text-sm font-semibold text-white">{user.username}</div>
        <div className="text-xs font-medium" style={{ color: '#FFD700' }}>{roleLabels[user.role] || user.role}</div>
        <div className="text-xs capitalize" style={{ color: 'rgba(192,207,232,0.7)' }}>{user.hierarchy_level?.replace('_', ' ')}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems
          .filter(item => !item.adminOnly || isAdmin)
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative border-l-4 ${
                  isActive
                    ? 'text-white border-l-4'
                    : 'border-transparent'
                }`
              }
              style={({ isActive }) => isActive
                ? { backgroundColor: 'rgba(255,215,0,0.12)', borderLeftColor: '#FFD700', color: '#fff' }
                : { color: 'rgba(192,207,232,0.85)' }
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Notifications' && notificationCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </NavLink>
          ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,215,0,0.2)' }}>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-sm transition-colors w-full px-2 py-2 rounded"
          style={{ color: 'rgba(192,207,232,0.75)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(192,207,232,0.75)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
