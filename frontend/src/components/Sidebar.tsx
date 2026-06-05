import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Network, ArrowLeftRight, Layers,
  FileText, Receipt, Bell, LogOut, Building2
} from 'lucide-react';
import type { User } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
  notificationCount?: number;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hierarchy', icon: Network, label: 'Hierarchy' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/allocations', icon: Layers, label: 'Allocations' },
  { to: '/receipts', icon: Receipt, label: 'Receipts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

const roleLabels: Record<string, string> = {
  general_council_admin: 'GC Admin',
  district_admin: 'District Admin',
  section_admin: 'Section Admin',
  church_admin: 'Church Admin',
  viewer: 'Viewer',
};

export function Sidebar({ user, onLogout, notificationCount = 0 }: Props) {
  return (
    <div className="h-full flex flex-col bg-navy-900 text-white w-64 min-w-[256px]">
      {/* Logo */}
      <div className="p-5 border-b border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center">
            <Building2 size={20} className="text-navy-900" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Assemblies of God</div>
            <div className="text-xs text-navy-300">Financial System</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 bg-navy-800 border-b border-navy-700">
        <div className="text-sm font-medium">{user.username}</div>
        <div className="text-xs text-gold-500">{roleLabels[user.role] || user.role}</div>
        <div className="text-xs text-navy-400 capitalize">{user.hierarchy_level?.replace('_', ' ')}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm transition-colors relative ${
                isActive
                  ? 'bg-navy-700 text-white border-l-4 border-gold-500'
                  : 'text-navy-300 hover:bg-navy-800 hover:text-white border-l-4 border-transparent'
              }`
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
      <div className="p-4 border-t border-navy-700">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-sm text-navy-300 hover:text-white transition-colors w-full px-2 py-2 rounded hover:bg-navy-800"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
