import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, CheckCircle } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import type { Notification } from '../types';

interface Props {
  wsMessage?: any;
}

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  approval_required: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  report: 'bg-purple-100 text-purple-700 border-purple-200',
  error: 'bg-red-100 text-red-700 border-red-200',
};

export function NotificationsPage({ wsMessage }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (wsMessage?.type === 'new_transaction') load();
  }, [wsMessage]);

  const unread = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={24} className="text-navy-700" />
          <h1 className="text-2xl font-bold text-navy-900">Notifications</h1>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unread} unread</span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 text-sm text-navy-600 hover:text-navy-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-blue-50' : ''}`}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeColors[n.type] || typeColors.info}`}>
                      {n.type.replace('_', ' ')}
                    </span>
                    {!n.is_read && <span className="text-xs text-blue-600 font-medium">New</span>}
                  </div>
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                    className="text-gray-300 hover:text-green-500 p-1"
                    title="Mark as read"
                  >
                    <CheckCircle size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
