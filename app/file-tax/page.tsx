'use client';

import { useRouter } from 'next/navigation';

export default function FileTaxPage() {
  const router = useRouter();

  const incomeCards = [
    {
      icon: '💼',
      title: 'Income from Salary',
      section: 'Section 17',
      amount: '₹ 12,80,000',
      note: 'Pay on or W.R.R & core',
      tag: 'Section 4',
      button: '+ Add Salary Income',
      route: '/income/salary',
      amountColor: 'text-white',
    },
    {
      icon: '🏠',
      title: 'Income from House Property',
      section: 'Sections 22-27',
      amount: '₹ (80,000)',
      note: 'Pay on W.R.R & core',
      tag: 'Section 11',
      button: '+ Add House Property Income',
      route: '/income/house-property',
      amountColor: 'text-rose-400',
    },
    {
      icon: '🤝',
      title: 'Profits & Gains from Business or Profession',
      section: 'PGBP (Sections 28-44AD)',
      amount: '₹ 6,40,000',
      note: 'Pay on W.R.R & core',
      tag: 'Section 35',
      button: '+ Add PGBP Income',
      route: '/income/pgbp',
      amountColor: 'text-white',
    },
    {
      icon: '📈',
      title: 'Income from Capital Gains',
      section: 'Sections 45-55',
      amount: '₹ 1,10,000',
      note: 'Pay on W.R.R & core',
      tag: 'Section 45',
      button: '+ Add Capital Gains',
      route: '/income/capital-gains',
      amountColor: 'text-white',
    },
    {
      icon: '🧾',
      title: 'Income from Other Sources',
      section: 'Sections 56-59',
      amount: '₹ 50,000',
      note: 'Pay on W.R.R & core',
      tag: 'Section 35',
      button: '+ Add Other Income',
      route: '/income/other-sources',
      amountColor: 'text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-300 transition hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-sm font-bold text-black">
              R
            </div>
            <span className="text-sm font-medium text-gray-200">Ramya</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-3xl">🐝</span>
              <span className="text-3xl font-bold text-yellow-400">TaxBee</span>
            </div>

            <h1 className="mb-2 text-4xl font-bold">
              Income Declaration for Section 139(1)
            </h1>
            <p className="text-lg text-gray-400">
              Declare your income and deductions for accurate computation
            </p>

            <div className="mt-6">
              <div className="mb-2 flex items-center gap-3 text-sm text-gray-300">
                <span className="font-semibold text-yellow-300">Step 1 of 4</span>
                <span>•</span>
                <span className="font-semibold text-white">Declare Income</span>
                <span>•</span>
                <span>Review Details</span>
                <span>•</span>
                <span>Claim Deductions</span>
              </div>

              <div className="h-2 w-[520px] rounded-full bg-gray-800">
                <div className="h-2 w-1/4 rounded-full bg-yellow-400"></div>
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="flex min-w-[160px] flex-col items-center">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[8px] border-yellow-400/80 border-t-gray-700 border-r-yellow-300">
              <div className="text-center">
                <p className="text-xs font-semibold tracking-wide text-gray-400">
                  INCOME
                </p>
                <p className="text-3xl font-bold text-white">80/100</p>
              </div>
            </div>
          </div>
        </div>

        {/* Income cards */}
        <div className="space-y-4">
          {incomeCards.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-yellow-400/10 bg-white/5 p-5 shadow-lg backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/20 text-4xl">
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold text-white">
                      {item.title}{' '}
                      <span className="text-lg font-normal text-gray-400">
                        ({item.section})
                      </span>
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">{item.note}</p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-300">
                        🔒 {item.tag}
                      </span>
                      <span className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-300">
                        ⓘ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <div className={`text-3xl font-bold ${item.amountColor}`}>
                    {item.amount} <span className="text-gray-400">›</span>
                  </div>

                  <button
                    onClick={() => router.push(item.route)}
                    className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
                  >
                    {item.button}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Tip */}
          <div className="rounded-2xl border border-yellow-400/10 bg-white/5 px-5 py-4 text-gray-300">
            <button className="flex w-full items-center justify-between text-left">
              <span className="text-base">
                <span className="font-semibold text-yellow-300">💡 Pro Tip:</span>{' '}
                Use Income sources on AIS!
              </span>
              <span className="text-xl text-gray-400">›</span>
            </button>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl bg-gray-800 px-8 py-4 text-lg font-medium text-white transition hover:bg-gray-700"
          >
            Cancel
          </button>

          <button className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-700 bg-white/5 text-3xl text-white">
            ↓
          </button>

          <div className="flex items-center gap-3">
            <button className="rounded-xl bg-gray-800 px-8 py-4 text-lg font-medium text-gray-300 transition hover:bg-gray-700">
              ‹ Back
            </button>

            <button
              onClick={() => router.push('/deductions')}
              className="rounded-xl bg-yellow-400 px-8 py-4 text-lg font-bold text-black transition hover:bg-yellow-300"
            >
              Proceed →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}