'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type User = {
  name: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;

    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [selectedYear, setSelectedYear] = useState('2025-26');

  const [verifiedPan, setVerifiedPan] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem('verifiedPan');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('verifiedPan');
    setUser(null);
    setVerifiedPan(null);
    router.push('/login');
  };

  const sidebarItems = [
    { icon: '⊙', label: 'Dashboard', route: '/dashboard' },
    { icon: '📄', label: 'File Tax', route: '/file-tax' },
    { icon: '💰', label: 'Tax Savings', route: '/tax-savings' },
    { icon: '📁', label: 'Documents', route: '/documents' },
    { icon: '❓', label: 'Help', route: '/help' },
  ];

  const quickActions = [
    { icon: '📋', label: 'Start New ITR Filing', route: '/file-your-itr', color: 'bg-orange-500' },
    { icon: '📥', label: 'Import Data (Form 26AS / AIS)', route: '/import-data', color: 'bg-blue-600' },
    { icon: '📄', label: 'Download Filed ITR', route: '/download-itr', color: 'bg-green-600' },
    { icon: '🤝', label: 'Assistance Filing', route: '/assistance-filing', color: 'bg-red-500' },
  ];

  const suggestions = [
    'Invest ₹50,000 under 80C to save ₹15,600 tax',
    'Get health insurance to reduce your tax by ₹7,500',
    'Optimize your HRA to save more',
  ];

  const activities = [
    { text: 'Salary details added', status: 'done' },
    { text: 'Deductions entered', status: 'done' },
    { text: 'ITR not filed', status: 'pending' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <aside className="fixed h-full w-60 bg-gray-900 px-4 py-6 text-white">
        <div className="mb-10 flex items-center gap-2 px-2">
          <span className="text-2xl">🐝</span>
          <span className="text-xl font-bold text-yellow-400">TaxBee</span>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.route)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === item.route
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-6 px-3 py-2 text-left text-sm text-gray-500 transition hover:text-red-400"
        >
          🚪 Logout
        </button>
      </aside>

      <main className="ml-60 flex-1 p-6">
        <div className="mb-6 rounded-[28px] bg-slate-100">
          <h1 className="text-4xl font-bold text-gray-900" suppressHydrationWarning>
            Welcome, {user?.name || 'User'}!
          </h1>
          <p className="mt-2 text-lg text-gray-500" suppressHydrationWarning>
            Financial Year : {selectedYear}
            <span className="mx-2">|</span>
            PAN: {verifiedPan || 'Not Verified'}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-semibold text-gray-700">
              ITR Filing Status: <span className="text-orange-500">Not Filed</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-semibold text-gray-700">
              Tax Health Score: <span className="text-blue-600">75/100</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-semibold text-gray-700">
              Refund Status: <span className="text-green-600">₹0</span>
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">Quick Actions</h2>

          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.route)}
                className={`${item.color} flex min-h-[88px] items-center gap-3 rounded-xl px-5 py-4 text-left text-white shadow-md transition hover:opacity-90`}
              >
                <span className="text-3xl">{item.icon}</span>
                <span className="text-base font-bold leading-snug">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-800">Tax Summary</h2>
            <div className="h-2 flex-1 rounded-full bg-gray-200">
              <div className="h-2 w-[35%] rounded-full bg-blue-500"></div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t border-gray-200 pt-6 text-center">
            <div>
              <p className="mb-2 text-lg text-gray-500">Total Income:</p>
              <p className="text-4xl font-bold text-gray-800">₹ 8,50,000</p>
            </div>

            <div>
              <p className="mb-2 text-lg text-gray-500">Deductions:</p>
              <p className="text-4xl font-bold text-gray-800">₹ 1,20,000</p>
            </div>

            <div>
              <p className="mb-2 text-lg text-gray-500">Tax Payable:</p>
              <p className="text-4xl font-bold text-gray-800">₹ 27,400</p>
            </div>

            <div>
              <p className="mb-2 text-lg text-gray-500">Refund / Due:</p>
              <p className="text-4xl font-bold text-gray-800">₹ 5,200</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow hover:bg-blue-700">
              ☞ View Detailed Calculation
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-gray-800">Smart Tax Saving Suggestions</h2>

          <div className="space-y-4 border-t border-gray-200 pt-5">
            {suggestions.map((item) => (
              <div key={item} className="flex items-center gap-3 text-xl text-gray-700">
                <span className="text-green-600">✔</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-gray-800">Your Activity</h2>

          <div className="space-y-4 border-t border-gray-200 pt-5">
            {activities.map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-4 border-b border-gray-100 pb-4 text-xl text-gray-700 last:border-b-0"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg ${
                    item.status === 'done'
                      ? 'border-green-300 text-green-600'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {item.status === 'done' ? '✔' : '◔'}
                </span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-blue-900">Need Help?</h2>

          <div className="space-y-4 border-t border-gray-200 pt-5">
            <button className="block w-full border-b border-gray-100 pb-4 text-left text-2xl font-medium text-gray-700 hover:text-blue-600">
              💬 Chat with Expert
            </button>

            <button className="block w-full text-left text-2xl font-medium text-gray-700 hover:text-blue-600">
              📞 Request Call Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}