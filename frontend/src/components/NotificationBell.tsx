import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import type { Notification } from '../types';

interface Props {
  wsMessage?: any;
}

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600',
  approval_required: 'bg-yellow-100 text-yellow-700',
  report: 'bg-purple-100 text-purple-700',
  error: 'bg-red-100 text-red-600',
};

export function NotificationBell({ wsMessage }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const load = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (wsMessage?.type === 'new_transaction' || wsMessage?.type === 'transaction_approved') {
      load();
    }
  }, [wsMessage]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-navy-300 hover:text-white rounded-lg hover:bg-navy-700 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm text-navy-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-navy-600 hover:text-navy-900 flex items-center gap-1">
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-blue-50' : ''}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0 ${typeColors[n.type] || typeColors.info}`}>
                      {n.type.replace('_', ' ')}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-700">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
