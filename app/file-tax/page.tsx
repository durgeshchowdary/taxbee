'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';

type DraftHead = Record<string, string | number | undefined>;
type DraftState = {
  salary?: DraftHead;
  houseProperty?: DraftHead;
  pgbp?: DraftHead;
  capitalGains?: DraftHead;
  otherSources?: DraftHead;
};
type IncomeIcon = 'salary' | 'house' | 'business' | 'gains' | 'other';
type SidebarIcon = 'dashboard' | 'file' | 'savings' | 'documents' | 'help';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const toNumber = (value: unknown) => {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value: number) =>
  `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`;

export default function FileTaxPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<DraftState>({});
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    const loadDraft = () => {
      setDraft(readJson<DraftState>(STORAGE_KEYS.ITR_DRAFT, {}));
      const user = readJson<{ name?: string } | null>(STORAGE_KEYS.USER, null);
      setUserName(user?.name || 'User');
    };

    loadDraft();
    window.addEventListener('taxbee:storage-updated', loadDraft);
    return () => window.removeEventListener('taxbee:storage-updated', loadDraft);
  }, []);

  const incomeCards = useMemo(() => {
    const grossSalary =
      toNumber(draft.salary?.salary17_1) +
      toNumber(draft.salary?.perquisites17_2) +
      toNumber(draft.salary?.profits17_3) -
      toNumber(draft.salary?.exemptions10) -
      toNumber(draft.salary?.deductions16);

    const netAnnualValue =
      toNumber(draft.houseProperty?.annualRent) -
      toNumber(draft.houseProperty?.municipalTax);
    const houseIncome =
      netAnnualValue -
      (netAnnualValue > 0 ? netAnnualValue * 0.3 : 0) -
      toNumber(draft.houseProperty?.interestOnLoan);

    const businessIncome =
      toNumber(draft.pgbp?.businessReceipts) -
      toNumber(draft.pgbp?.businessExpenses) +
      toNumber(draft.pgbp?.otherBusinessIncome) -
      toNumber(draft.pgbp?.depreciation);

    const capitalGainsIncome =
      toNumber(draft.capitalGains?.saleValue) -
      toNumber(draft.capitalGains?.costOfAcquisition) -
      toNumber(draft.capitalGains?.transferExpenses);

    const otherSourcesIncome =
      toNumber(draft.otherSources?.savingsInterest) +
      toNumber(draft.otherSources?.fdInterest) +
      toNumber(draft.otherSources?.dividendIncome) +
      toNumber(draft.otherSources?.otherIncome);

    return [
      {
        icon: 'salary' as IncomeIcon,
        title: 'Income from Salary',
        section: 'Section 17',
        amount: grossSalary,
        note: 'Salary, perquisites, exemptions, and section 16 deductions',
        tag: 'Form 16',
        button: 'Review salary income',
        route: '/file-your-itr',
        tone: 'bg-blue-50 text-blue-700 ring-blue-100',
      },
      {
        icon: 'house' as IncomeIcon,
        title: 'Income from House Property',
        section: 'Sections 22-27',
        amount: houseIncome,
        note: 'Rent, municipal tax, standard deduction, and loan interest',
        tag: 'House Property',
        button: 'Review house property',
        route: '/file-your-itr',
        tone: 'bg-orange-50 text-orange-700 ring-orange-100',
      },
      {
        icon: 'business' as IncomeIcon,
        title: 'Profits and Gains from Business or Profession',
        section: 'Sections 28-44AD',
        amount: businessIncome,
        note: 'Receipts, expenses, depreciation, and professional income',
        tag: 'PGBP',
        button: 'Review business income',
        route: '/file-your-itr',
        tone: 'bg-purple-50 text-purple-700 ring-purple-100',
      },
      {
        icon: 'gains' as IncomeIcon,
        title: 'Income from Capital Gains',
        section: 'Sections 45-55',
        amount: capitalGainsIncome,
        note: 'Sale value, acquisition cost, and transfer expenses',
        tag: 'Capital Gains',
        button: 'Review capital gains',
        route: '/file-your-itr',
        tone: 'bg-green-50 text-green-700 ring-green-100',
      },
      {
        icon: 'other' as IncomeIcon,
        title: 'Income from Other Sources',
        section: 'Sections 56-59',
        amount: otherSourcesIncome,
        note: 'Savings interest, FD interest, dividend, and other income',
        tag: 'Other Sources',
        button: 'Review other income',
        route: '/file-your-itr',
        tone: 'bg-rose-50 text-rose-700 ring-rose-100',
      },
    ];
  }, [draft]);

  const totalIncome = incomeCards.reduce((sum, item) => sum + item.amount, 0);
  const completedHeads = incomeCards.filter((item) => Math.abs(item.amount) > 0).length;
  const progress = Math.max(18, Math.round((completedHeads / incomeCards.length) * 100));

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AIS_IMPORT);
    localStorage.removeItem(STORAGE_KEYS.VERIFIED_PAN);
    localStorage.removeItem(STORAGE_KEYS.TAXPAYER_PROFILE);
    localStorage.removeItem('token');
    router.push('/login');
  };

  const sidebarItems = [
    { icon: 'dashboard' as SidebarIcon, label: 'Dashboard', route: '/dashboard' },
    { icon: 'file' as SidebarIcon, label: 'File Tax', route: '/file-tax' },
    { icon: 'savings' as SidebarIcon, label: 'Tax Savings', route: '/tax-savings' },
    { icon: 'documents' as SidebarIcon, label: 'Documents', route: '/documents' },
    { icon: 'help' as SidebarIcon, label: 'Help', route: '/help' },
  ];

  const renderIncomeIcon = (icon: IncomeIcon) => {
    const className = 'h-8 w-8';

    if (icon === 'salary') {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 8h16v11H4V8Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 12h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === 'house') {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path d="m4 11 8-7 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 10.5V20h11v-9.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    }

    if (icon === 'business') {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path d="M5 21V7h6v14M13 21V3h6v18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M7 10h2M7 14h2M7 18h2M15 6h2M15 10h2M15 14h2M15 18h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === 'gains') {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m5 15 4-4 3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 7h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M6 6h12v14H6V6Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 4h8v4H8V4Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  };

  const renderSidebarIcon = (icon: SidebarIcon) => {
    const iconClass = 'h-5 w-5';

    if (icon === 'dashboard') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M4 5h7v6H4V5ZM13 5h7v4h-7V5ZM13 11h7v8h-7v-8ZM4 13h7v6H4v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    }

    if (icon === 'file') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.5 13h5M9.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === 'savings') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M6 11c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5-2.7 5.5-6 5.5S6 14 6 11Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v6M9.5 10h3.8a1.7 1.7 0 0 1 0 3.4H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 18.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === 'documents') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M4 7.5h6l1.6 2H20v8.5H4V7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M4 7.5V5h5.5l1.6 2H17" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
        <path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-.9.8-1.8 1.3-1.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-gray-900">
      <aside className="fixed flex h-full w-64 flex-col border-r border-gray-800 bg-[#0f172a] px-4 py-5 text-white shadow-2xl">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-7 flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-yellow-400/20 ring-2 ring-yellow-400/70">
            <Image src="/logo.jpg" alt="TaxBee logo" width={48} height={48} className="h-full w-full object-cover" priority />
          </span>
          <span>
            <span className="block text-xl font-black tracking-tight text-white">TaxBee</span>
            <span className="block text-xs font-semibold text-gray-400">Personal tax workspace</span>
          </span>
        </button>

        <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Menu
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.route)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                pathname === item.route
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/15'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-10 items-center justify-center rounded-lg ${
                  pathname === item.route
                    ? 'bg-black/10 text-black'
                    : 'bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white'
                }`}
              >
                {renderSidebarIcon(item.icon)}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-gray-400">Signed in</p>
          <p className="mt-1 truncate text-sm font-bold text-white">{userName}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-red-400/20 px-3 py-2 text-left text-sm font-semibold text-red-300 transition hover:bg-red-400/10 hover:text-red-200"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-6">
        <div className="mb-6 rounded-[28px] bg-slate-100">
          <h1 className="text-4xl font-bold text-gray-900">
            File Tax
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Income Declaration for Section 139(1)
            <span className="mx-2">|</span>
            Step 1 of 4
          </p>
        </div>

        <section className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total Income Mapped</p>
            <p className="mt-2 text-3xl font-bold text-gray-800">{formatMoney(totalIncome)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Income Heads Started</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{completedHeads}/{incomeCards.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Current Step</p>
            <p className="mt-2 text-3xl font-bold text-orange-500">Declare Income</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Income Workspace</h2>
              <p className="mt-1 text-sm text-gray-500">
                Review every income head, confirm imported values, and move to deductions when the draft looks right.
              </p>
            </div>

            <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-gray-900">
              Step 1 of 4
            </span>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm font-semibold">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-white">Declare Income</span>
              <span className="text-gray-400">Review Details</span>
              <span className="text-gray-400">Claim Deductions</span>
              <span className="text-gray-400">Final Check</span>
            </div>

            <div className="h-2 rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-bold text-gray-900">
                {completedHeads} of {incomeCards.length} income heads started
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Import AIS/Form 26AS or open each head to complete missing values before proceeding.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {incomeCards.map((item) => (
            <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-center justify-between gap-6">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-1 ${item.tone}`}>
                    {renderIncomeIcon(item.icon)}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {item.title}{' '}
                      <span className="text-base font-semibold text-gray-400">
                        ({item.section})
                      </span>
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">{item.note}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                        {item.tag}
                      </span>
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        Review required
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex min-w-[220px] flex-col items-end gap-4">
                  <div className={`text-3xl font-black ${item.amount < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {formatMoney(item.amount)}
                  </div>

                  <button
                    onClick={() => router.push(item.route)}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    {item.button}
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-gray-700 shadow-sm">
            <button className="flex w-full items-center justify-between text-left">
              <span className="text-base">
                <span className="font-bold text-gray-950">Pro Tip:</span>{' '}
                Use AIS/Form 26AS import to prefill income heads before final review.
              </span>
              <span className="text-xl text-blue-700">&gt;</span>
            </button>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Back
            </button>

            <button
              onClick={() => router.push('/deductions')}
              className="rounded-xl bg-yellow-400 px-8 py-4 text-lg font-black text-black shadow-sm transition hover:bg-yellow-300"
            >
              Proceed
            </button>
          </div>
        </div>
      </main>

      <BeeAssistantProvider />
    </div>
  );
}
