'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';
import { LoadingDashboard, WorkspaceShell } from '@/app/dashboard/_components/DashboardComponents';
import { useProtectedSession } from '@/app/_hooks/useProtectedSession';
import { apiFetch } from '@/app/_utils/authClient';
import { statusForTaxLoadFailure } from '@/app/_utils/taxStatus';

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

export default function DocumentsPage() {
  const router = useRouter();
  const { session, isLoading, signOut } = useProtectedSession();
  const [aisImport, setAisImport] = useState<AisImport>(null);
  const [records, setRecords] = useState<ExtractionReviewRecord[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!session) return;

    const refresh = async () => {
      try {
        const res = await apiFetch('/api/tax-context');
        const data = await res.json();
        if (!res.ok || data?.success === false) {
          setAisImport(null);
          setRecords([]);
          setStatus(
            statusForTaxLoadFailure({
              res,
              data,
              emptyMessage: 'Upload AIS, Form 26AS, or Form 16 to begin extraction.',
              fallbackMessage: 'Could not load imported documents from MongoDB.',
            })
          );
          return;
        }
        setAisImport(data.data?.aisImport || null);
        setRecords(data.data?.extractionReview || []);
        setStatus(data.data?.imports?.length || data.data?.extractionReview?.length ? '' : 'Upload AIS, Form 26AS, or Form 16 to begin extraction.');
      } catch (error) {
        setAisImport(null);
        setRecords([]);
        setStatus(error instanceof Error ? error.message : 'Could not load imported documents from MongoDB.');
      }
    };
    void refresh();
  }, [session]);

  if (isLoading || !session) {
    return <LoadingDashboard />;
  }

  const totals = aisImport?.totals || {};
  const confirmed = records.filter((record) => record.status !== 'extracted').length;

  return (
    <WorkspaceShell
      title="Documents"
      subtitle="Review imported documents, extracted fields, confidence, and confirmation status."
      user={session.user}
      onLogout={() => {
        void signOut();
        router.replace('/login');
      }}
      actions={
        <button
          onClick={() => router.push('/import-data')}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Import document
        </button>
      }
    >
      {status ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {status}
        </p>
      ) : null}
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
      <BeeAssistantProvider />
    </WorkspaceShell>
  );
}
