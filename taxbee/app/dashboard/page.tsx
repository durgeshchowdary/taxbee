'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardPage() {
const router = useRouter();
const pathname = usePathname();

const [user, setUser] = useState<{ name: string } | null>(null);
const [selectedYear, setSelectedYear] = useState('2025-26');
const [verifiedPan, setVerifiedPan] = useState<string | null>(null);

useEffect(() => {
const stored = localStorage.getItem('user');

```
if (!stored) {
  router.push('/login');
} else {
  setUser(JSON.parse(stored));
}

const pan = localStorage.getItem('verifiedPan');
if (pan) setVerifiedPan(pan);
```

}, [router]);

const handleLogout = () => {
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.removeItem('verifiedPan');
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
{ icon: '📂', label: 'Upload Documents', route: '/upload-documents' },
{ icon: '💼', label: 'Income Details', route: '/income-details' },
{ icon: '🧮', label: 'Deductions', route: '/deductions' },
{ icon: '📋', label: 'File Your ITR', route: '/file-tax' },
];

return ( <div className="flex min-h-screen bg-gray-100 font-sans">

```
  {/* Sidebar */}
  <aside className="w-60 bg-gray-900 text-white flex flex-col py-6 px-4 fixed h-full">
    <div className="flex items-center gap-2 mb-10 px-2">
      <span className="text-2xl">🐝</span>
      <span className="text-xl font-bold text-yellow-400">Tax Bee</span>
    </div>

    <nav className="flex flex-col gap-2 flex-1">
      {sidebarItems.map((item) => (
        <button
          key={item.label}
          onClick={() => router.push(item.route)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
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
      className="text-gray-500 hover:text-red-400 text-sm px-3 py-2 text-left transition"
    >
      🚪 Logout
    </button>
  </aside>

  {/* Main Content */}
  <main className="ml-60 flex-1 p-8">

    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.name || 'User'}!
        </h1>

        {/* Assessment Year */}
        <div className="flex items-center gap-2">
          <label className="text-gray-600 font-medium">Assessment Year:</label>
          <select
            className="border border-gray-300 rounded px-2 py-1 text-black bg-white"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {['2023-24', '2024-25', '2025-26'].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Verify PAN */}
        <button
          onClick={() => router.push('/verify-pan')}
          className="bg-yellow-400 text-black font-medium px-3 py-1 rounded hover:bg-yellow-300 transition text-sm"
        >
          Verify PAN
        </button>

        {verifiedPan && (
          <span className="text-gray-700 font-semibold ml-3">
            PAN: {verifiedPan}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="bg-yellow-400 text-black font-bold px-5 py-2 rounded-lg hover:bg-yellow-300 transition text-sm">
          Start Filing
        </button>

        <button className="border border-gray-300 text-gray-700 font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition text-sm">
          Get Assistance
        </button>

        <button className="border border-gray-300 p-2 rounded-lg hover:bg-gray-50 transition">
          🔔
        </button>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-4 gap-4 mb-6">
      {quickActions.map((item) => (
        <button
          key={item.label}
          onClick={() => router.push(item.route)}
          className={`flex items-center gap-3 p-4 rounded-xl font-medium text-sm transition shadow-sm ${
            pathname === item.route
              ? 'bg-white border-b-4 border-yellow-400 text-gray-900'
              : 'bg-white text-gray-700 hover:shadow-md border border-gray-100'
          }`}
        >
          <span className="text-2xl">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>

    {/* Bottom Grid */}
    <div className="grid grid-cols-2 gap-6">

      {/* Left */}
      <div className="flex flex-col gap-6">

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Tax Summary</h2>

          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-800">
              Tax Payable <span className="text-black font-bold">₹12,500</span>
            </span>

            <span className="text-sm text-gray-500">
              Total Taxes Saved <span className="text-green-600 font-semibold">₹45,000</span>
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-5">
            <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '35%' }}></div>
          </div>

          <h3 className="font-semibold text-gray-800 mb-3">
            Tax Savings Opportunities
          </h3>

          <ul className="flex flex-col gap-2">
            {['Invest in 80C', 'Claim HRA Benefits', 'Get Health Insurance'].map((tip) => (
              <li key={tip} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-yellow-500 font-bold">✓</span> {tip}
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Right */}
      <div className="flex flex-col gap-6">

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">
            Your Tax Health Score
          </h2>

          <div className="text-center">
            <span className="text-4xl font-bold text-gray-900">75</span>
            <p className="text-sm text-gray-600">
              <span className="text-green-500 font-semibold">Good</span>, but can improve
            </p>
          </div>
        </div>

      </div>

    </div>

  </main>
</div>
```

);
}
