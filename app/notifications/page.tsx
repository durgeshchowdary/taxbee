'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';

type SidebarIcon = 'dashboard' | 'file' | 'savings' | 'documents' | 'help';
type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read';
  emailStatus: string;
  createdAt: string;
};

const sidebarItems = [
  { icon: 'dashboard' as SidebarIcon, label: 'Dashboard', route: '/dashboard' },
  { icon: 'file' as SidebarIcon, label: 'File Tax', route: '/file-tax' },
  { icon: 'savings' as SidebarIcon, label: 'Tax Savings', route: '/tax-savings' },
  { icon: 'documents' as SidebarIcon, label: 'Documents', route: '/documents' },
  { icon: 'help' as SidebarIcon, label: 'Help', route: '/help' },
];

function SidebarIconView({ icon }: { icon: SidebarIcon }) {
  const iconClass = 'h-5 w-5';
  if (icon === 'dashboard') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M4 5h7v6H4V5ZM13 5h7v4h-7V5ZM13 11h7v8h-7v-8ZM4 13h7v6H4v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (icon === 'file') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" /><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" /><path d="M9.5 13h5M9.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (icon === 'savings') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M6 11c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5-2.7 5.5-6 5.5S6 14 6 11Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v6M9.5 10h3.8a1.7 1.7 0 0 1 0 3.4H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M8 18.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (icon === 'documents') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M4 7.5h6l1.6 2H20v8.5H4V7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M4 7.5V5h5.5l1.6 2H17" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-.9.8-1.8 1.3-1.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z" stroke="currentColor" strokeWidth="1.8" /></svg>;
}

export default function NotificationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState('');

  const loadNotifications = async () => {
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
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const markRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
    if (res.ok) void loadNotifications();
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-gray-900">
      <aside className="fixed flex h-full w-64 flex-col border-r border-gray-800 bg-[#0f172a] px-4 py-5 text-white shadow-2xl">
        <button onClick={() => router.push('/dashboard')} className="mb-7 flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10">
          <span className="flex h-12 w-12 overflow-hidden rounded-xl bg-white ring-2 ring-yellow-400/70">
            <Image src="/logo.jpg" alt="TaxBee logo" width={48} height={48} className="object-cover" priority />
          </span>
          <span><span className="block text-xl font-black text-white">TaxBee</span><span className="block text-xs font-semibold text-gray-400">Notifications</span></span>
        </button>
        <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Menu</div>
        <nav className="flex flex-1 flex-col gap-1.5">
          {sidebarItems.map((item) => (
            <button key={item.label} onClick={() => router.push(item.route)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${pathname === item.route ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <span className={`flex h-8 w-10 items-center justify-center rounded-lg ${pathname === item.route ? 'bg-black/10 text-black' : 'bg-white/5 text-gray-300'}`}><SidebarIconView icon={item.icon} /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="ml-64 flex-1 p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-2 text-lg text-gray-500">{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p>
            {status && <p className="mt-2 text-sm font-semibold text-amber-700">{status}</p>}
          </div>
        </div>

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
      </main>
      <BeeAssistantProvider />
    </div>
  );
}
