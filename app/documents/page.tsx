'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';

type SidebarIcon = 'dashboard' | 'file' | 'savings' | 'documents' | 'help';
type ExtractionReviewRecord = {
  id: string;
  source: string;
  label: string;
  value: string;
  mappedSection: string;
  confidence: number;
  status: 'extracted' | 'confirmed' | 'overridden';
  updatedAt: string;
};
type AisImport = {
  fileName?: string;
  importedAt?: string;
  detectedSections?: string[];
  totals?: Record<string, number>;
} | null;

const formatMoney = (value: number) =>
  `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`;

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

export default function DocumentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [aisImport, setAisImport] = useState<AisImport>(null);
  const [records, setRecords] = useState<ExtractionReviewRecord[]>([]);

  useEffect(() => {
    const refresh = () => {
      try {
        setAisImport(JSON.parse(localStorage.getItem(STORAGE_KEYS.AIS_IMPORT) || 'null'));
        setRecords(JSON.parse(localStorage.getItem(STORAGE_KEYS.EXTRACTION_REVIEW) || '[]'));
      } catch {
        setAisImport(null);
        setRecords([]);
      }
    };
    refresh();
    window.addEventListener('taxbee:storage-updated', refresh);
    return () => window.removeEventListener('taxbee:storage-updated', refresh);
  }, []);

  const totals = aisImport?.totals || {};
  const confirmed = records.filter((record) => record.status !== 'extracted').length;

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-gray-900">
      <aside className="fixed flex h-full w-64 flex-col border-r border-gray-800 bg-[#0f172a] px-4 py-5 text-white shadow-2xl">
        <button onClick={() => router.push('/dashboard')} className="mb-7 flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10">
          <span className="flex h-12 w-12 overflow-hidden rounded-xl bg-white ring-2 ring-yellow-400/70">
            <Image src="/logo.jpg" alt="TaxBee logo" width={48} height={48} className="object-cover" priority />
          </span>
          <span><span className="block text-xl font-black text-white">TaxBee</span><span className="block text-xs font-semibold text-gray-400">Document vault</span></span>
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
            <h1 className="text-4xl font-bold text-gray-900">Documents</h1>
            <p className="mt-2 text-lg text-gray-500">Review imported documents, extracted fields, confidence, and confirmation status.</p>
          </div>
          <button onClick={() => router.push('/import-data')} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Import document</button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold text-gray-500">Current source</p><p className="mt-2 text-xl font-bold">{aisImport?.fileName || 'No document imported'}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold text-gray-500">Confirmed fields</p><p className="mt-2 text-xl font-bold">{confirmed}/{records.length}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold text-gray-500">TDS extracted</p><p className="mt-2 text-xl font-bold">{formatMoney(Number(totals.tds || 0))}</p></div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-800">Extraction Provenance</h2>
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr><th className="px-4 py-3">Field</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Confidence</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.map((record) => (
                  <tr key={record.id} className="border-t border-gray-200">
                    <td className="px-4 py-3"><p className="font-bold text-gray-900">{record.label}</p><p className="text-xs text-gray-500">{record.source}</p></td>
                    <td className="px-4 py-3 text-gray-700">{record.mappedSection}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(Number(record.value || 0))}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{record.confidence}%</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${record.status === 'confirmed' ? 'bg-green-50 text-green-700' : record.status === 'overridden' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-gray-700'}`}>{record.status}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No extracted document fields yet. Import AIS, Form 26AS, or Form 16 to begin.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <BeeAssistantProvider />
    </div>
  );
}
