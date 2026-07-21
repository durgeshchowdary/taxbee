'use client';

import { useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';
import { WorkspaceShell } from '@/app/dashboard/_components/DashboardComponents';

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

  return (
    <WorkspaceShell
      title="Help Center"
      subtitle="Get guidance for filing, document review, tax savings, and expert support."
    >
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

      <BeeAssistantProvider />
    </WorkspaceShell>
  );
}
