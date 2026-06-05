import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { NotificationBell } from './components/NotificationBell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { HierarchyPage } from './pages/HierarchyPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AllocationsPage } from './pages/AllocationsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { useAuth } from './hooks/useAuth';
import { useWebSocket, type WSMessage } from './hooks/useWebSocket';
import { Wifi, WifiOff } from 'lucide-react';

function AppLayout() {
  const { user, login, logout, canApprove, isAdmin, isDistrictAdmin, isSectionAdmin } = useAuth();
  const [wsMessage, setWsMessage] = useState<WSMessage | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleWsMessage = useCallback((msg: WSMessage) => {
    setWsMessage(msg);
    if (msg.type === 'new_transaction' || msg.type === 'approval_required') {
      setUnreadCount(c => c + 1);
    }
  }, []);

  const { connected } = useWebSocket(user ? handleWsMessage : undefined);

  if (!user) {
    return <Login onLogin={login} />;
  }

  const canEditHierarchy = isAdmin || isDistrictAdmin || isSectionAdmin;
  const canEditAllocations = isAdmin || isDistrictAdmin;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} onLogout={logout} notificationCount={unreadCount} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-navy-800 text-white px-6 py-2 flex items-center justify-between border-b border-navy-700 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-navy-300">
            {connected ? (
              <><Wifi size={12} className="text-green-400" /> <span className="text-green-400">Live</span></>
            ) : (
              <><WifiOff size={12} className="text-yellow-400" /> <span className="text-yellow-400">Reconnecting...</span></>
            )}
          </div>
          <NotificationBell wsMessage={wsMessage} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard wsMessage={wsMessage} />} />
            <Route path="/hierarchy" element={<HierarchyPage canEdit={canEditHierarchy} />} />
            <Route path="/transactions" element={<TransactionsPage canApprove={canApprove} wsMessage={wsMessage} />} />
            <Route path="/allocations" element={<AllocationsPage canEdit={canEditAllocations} />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage wsMessage={wsMessage} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
