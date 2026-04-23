'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';
import { buildTaxIntelligence } from '@/backend/utils/taxEngine';

type SidebarIcon = 'dashboard' | 'file' | 'savings' | 'documents' | 'help';
type AmountMap = Record<string, string | number | undefined>;
type DraftState = {
  salary?: AmountMap;
  houseProperty?: AmountMap;
  pgbp?: AmountMap;
  capitalGains?: AmountMap;
  otherSources?: AmountMap;
};
type SavingRecommendation = {
  title: string;
  detail: string;
  impact: number;
} | null;
type ScenarioComparison = {
  id: string;
  label: string;
  tax: number;
  savingVsCurrent: number;
  detail: string;
};

const formatMoney = (value: number) =>
  `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`;

const sidebarItems = [
  { icon: 'dashboard' as SidebarIcon, label: 'Dashboard', route: '/dashboard' },
  { icon: 'file' as SidebarIcon, label: 'File Tax', route: '/file-tax' },
  { icon: 'savings' as SidebarIcon, label: 'Tax Savings', route: '/tax-savings' },
  { icon: 'documents' as SidebarIcon, label: 'Documents', route: '/documents' },
  { icon: 'help' as SidebarIcon, label: 'Help', route: '/help' },
];

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
};

function SidebarIconView({ icon }: { icon: SidebarIcon }) {
  const iconClass = 'h-5 w-5';
  if (icon === 'dashboard') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M4 5h7v6H4V5ZM13 5h7v4h-7V5ZM13 11h7v8h-7v-8ZM4 13h7v6H4v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (icon === 'file') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" /><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" /><path d="M9.5 13h5M9.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (icon === 'savings') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M6 11c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5-2.7 5.5-6 5.5S6 14 6 11Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v6M9.5 10h3.8a1.7 1.7 0 0 1 0 3.4H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M8 18.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (icon === 'documents') return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M4 7.5h6l1.6 2H20v8.5H4V7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M4 7.5V5h5.5l1.6 2H17" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 24 24" className={iconClass} fill="none"><path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-.9.8-1.8 1.3-1.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z" stroke="currentColor" strokeWidth="1.8" /></svg>;
}

export default function TaxSavingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<DraftState>({});
  const [deductions, setDeductions] = useState<AmountMap>({});
  const [aisImport, setAisImport] = useState<unknown>(null);

  useEffect(() => {
    const refresh = () => {
      setDraft(readJson<DraftState>(STORAGE_KEYS.ITR_DRAFT, {}));
      setDeductions(readJson<AmountMap>(STORAGE_KEYS.DEDUCTIONS, {}));
      setAisImport(readJson<unknown>(STORAGE_KEYS.AIS_IMPORT, null));
    };
    refresh();
    window.addEventListener('taxbee:storage-updated', refresh);
    return () => window.removeEventListener('taxbee:storage-updated', refresh);
  }, []);

  const intelligence = useMemo(
    () => buildTaxIntelligence({ currentDraft: draft, deductions, aisImport }),
    [aisImport, deductions, draft]
  );
  const scenarios = intelligence.explanation.scenarioComparison as ScenarioComparison[];
  const recommendations = (intelligence.recommendations as SavingRecommendation[]).filter(
    (item): item is NonNullable<SavingRecommendation> => Boolean(item)
  );
  const bestScenario = scenarios
    .filter((scenario) => scenario.savingVsCurrent > 0)
    .sort((a, b) => b.savingVsCurrent - a.savingVsCurrent)[0];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-gray-900">
      <aside className="fixed flex h-full w-64 flex-col border-r border-gray-800 bg-[#0f172a] px-4 py-5 text-white shadow-2xl">
        <button onClick={() => router.push('/dashboard')} className="mb-7 flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10">
          <span className="flex h-12 w-12 overflow-hidden rounded-xl bg-white ring-2 ring-yellow-400/70">
            <Image src="/logo.jpg" alt="TaxBee logo" width={48} height={48} className="object-cover" priority />
          </span>
          <span><span className="block text-xl font-black text-white">TaxBee</span><span className="block text-xs font-semibold text-gray-400">Savings planner</span></span>
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
            <h1 className="text-4xl font-bold text-gray-900">Tax Savings</h1>
            <p className="mt-2 text-lg text-gray-500">Personalized savings opportunities from your current draft and deduction data.</p>
          </div>
          <button onClick={() => router.push('/deductions')} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Edit deductions</button>
        </div>

        <section className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">Best visible opportunity</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{bestScenario?.label || 'No major savings gap yet'}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
            {bestScenario?.detail || 'Add income and deduction details so TaxBee can simulate savings more accurately.'}
          </p>
          <p className="mt-4 text-2xl font-bold text-green-700">{formatMoney(bestScenario?.savingVsCurrent || 0)}</p>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {recommendations.slice(0, 3).map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.detail}</p>
              <p className="mt-4 text-lg font-bold text-green-700">{formatMoney(item.impact || 0)}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-800">Scenario Comparison</h2>
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr><th className="px-4 py-3">Scenario</th><th className="px-4 py-3">Tax</th><th className="px-4 py-3">Saving</th><th className="px-4 py-3">Why</th></tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 font-bold text-gray-900">{scenario.label}</td>
                    <td className="px-4 py-3">{formatMoney(scenario.tax)}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{formatMoney(scenario.savingVsCurrent)}</td>
                    <td className="px-4 py-3 text-gray-600">{scenario.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <BeeAssistantProvider />
    </div>
  );
}
