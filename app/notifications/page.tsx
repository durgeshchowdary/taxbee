'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';
import { WorkspaceShell } from '@/app/dashboard/_components/DashboardComponents';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read';
  emailStatus: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load notifications');
      setNotifications(data.data?.notifications || []);
      setUnreadCount(Number(data.data?.unreadCount || 0));
      setStatus((data.data?.notifications || []).length ? '' : 'No notifications yet');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load notifications.');
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
    if (res.ok) void loadNotifications();
  };

  return (
    <WorkspaceShell
      title="Notifications"
      subtitle={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
      actions={
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Back to dashboard
        </button>
      }
    >
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {notifications.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{item.type.replaceAll('_', ' ')}</p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{item.message}</p>
                  <p className="mt-2 text-xs font-semibold text-gray-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                {item.status === 'unread' && (
                  <button onClick={() => markRead(item.id)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm font-semibold text-gray-500">
              No notifications yet
            </div>
          )}
        </div>
      </section>
      <BeeAssistantProvider />
    </WorkspaceShell>
  );
}
