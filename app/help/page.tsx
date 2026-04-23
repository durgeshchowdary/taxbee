'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';

type SidebarIcon = 'dashboard' | 'file' | 'savings' | 'documents' | 'help';

const supportCards = [
  {
    title: 'Filing guidance',
    detail: 'Get step-by-step help for income, deductions, regime comparison, and final review.',
    action: 'Start filing',
    route: '/file-your-itr',
  },
  {
    title: 'Document import help',
    detail: 'Upload AIS, Form 26AS, or readable Form 16 and review extracted values before filing.',
    action: 'Import documents',
    route: '/import-data',
  },
  {
    title: 'Tax saving review',
    detail: 'Check 80C, 80D, home-loan interest, and scenario-based savings opportunities.',
    action: 'Review savings',
    route: '/tax-savings',
  },
  {
    title: 'Expert assistance',
    detail: 'Use TaxBee intelligence outputs to prepare a clean case for CA or expert review.',
    action: 'Open dashboard',
    route: '/dashboard',
  },
];

const faqItems = [
  {
    q: 'Why does TaxBee ask me to confirm extracted values?',
    a: 'Tax documents can be messy. TaxBee separates extracted data from trusted filing data so you can correct values before they affect tax calculations.',
  },
  {
    q: 'How does TaxBee choose old or new regime?',
    a: 'The tax engine computes both regimes using your current draft, applies deductions and standard deduction rules, then recommends the lower estimate.',
  },
  {
    q: 'What does the risk score mean?',
    a: 'Risk points come from checks such as missing AIS/Form 26AS, TDS mismatch, interest not declared, high deductions, or unreviewed fields.',
  },
  {
    q: 'Can Bee Assistant answer from my real data?',
    a: 'Yes. It reads the same tax intelligence output as the dashboard, including risks, scenarios, explanation, and extraction review status.',
  },
];

export default function HelpPage() {
  const router = useRouter();
  const pathname = usePathname();

  const sidebarItems = [
    { icon: 'dashboard' as SidebarIcon, label: 'Dashboard', route: '/dashboard' },
    { icon: 'file' as SidebarIcon, label: 'File Tax', route: '/file-tax' },
    { icon: 'savings' as SidebarIcon, label: 'Tax Savings', route: '/tax-savings' },
    { icon: 'documents' as SidebarIcon, label: 'Documents', route: '/documents' },
    { icon: 'help' as SidebarIcon, label: 'Help', route: '/help' },
  ];

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
            <span className="block text-xs font-semibold text-gray-400">Support center</span>
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
      </aside>

      <main className="ml-64 flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Help Center</h1>
          <p className="mt-2 text-lg text-gray-500">
            Get guidance for filing, document review, tax savings, and expert support.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">Fastest help</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">Ask Bee Assistant with your actual tax data</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
                Ask why your risk score is high, why a regime was chosen, what extracted fields need review, or what to do next.
              </p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('taxbee:open-assistant'))}
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800"
            >
              Open Bee Assistant
            </button>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          {supportCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">{card.title}</h2>
              <p className="mt-3 leading-7 text-gray-600">{card.detail}</p>
              <button
                onClick={() => router.push(card.route)}
                className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                {card.action}
              </button>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-800">Common Questions</h2>
          <div className="mt-5 grid gap-4 border-t border-gray-200 pt-5">
            {faqItems.map((faq) => (
              <div key={faq.q} className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-bold text-gray-900">{faq.q}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-800">Need Human Review?</h2>
          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            Prepare your case with confirmed extraction values, tax explanation, regime comparison, and risk breakdown, then share it with a CA or expert reviewer.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/import-data')}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"
            >
              Review documents
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
            >
              Open filing summary
            </button>
          </div>
        </section>
      </main>

      <BeeAssistantProvider />
    </div>
  );
}
