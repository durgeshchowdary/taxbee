'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BeeAssistantProvider from '@/components/BeeAssistantProvider';
import { WorkspaceShell } from '@/app/dashboard/_components/DashboardComponents';
import { statusForTaxLoadFailure } from '@/app/_utils/taxStatus';

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

export default function TaxSavingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [hasTaxData, setHasTaxData] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioComparison[]>([]);
  const [recommendations, setRecommendations] = useState<NonNullable<SavingRecommendation>[]>([]);

  useEffect(() => {
    const loadSavings = async () => {
      try {
        const res = await fetch('/api/tax-savings');
        const data = await res.json();
        if (!res.ok || data?.success === false) {
          setStatus(
            statusForTaxLoadFailure({
              res,
              data,
              emptyMessage: 'Import documents to calculate tax savings',
              fallbackMessage: 'Could not load tax savings from MongoDB.',
            })
          );
          return;
        }
        setHasTaxData(Boolean(data.data?.hasTaxData));
        setScenarios(data.data?.scenarios || []);
        setRecommendations((data.data?.opportunities || data.data?.recommendations || []).filter(Boolean));
        setStatus(data.data?.hasTaxData ? '' : 'Import documents to calculate tax savings');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Could not load tax savings from MongoDB.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadSavings();
  }, []);
  const bestScenario = scenarios
    .filter((scenario) => scenario.savingVsCurrent > 0)
    .sort((a, b) => b.savingVsCurrent - a.savingVsCurrent)[0];

  return (
    <WorkspaceShell
      title="Tax Savings"
      subtitle="Personalized savings opportunities from your current draft and deduction data."
      sidebarTitle="TaxBee"
      sidebarSubtitle="Savings planner"
      actions={
        <button onClick={() => router.push('/deductions')} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Edit deductions</button>
      }
    >
        {(isLoading || status) && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {isLoading ? 'Loading savings from MongoDB...' : status}
          </p>
        )}

        <section className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">Best visible opportunity</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{bestScenario?.label || 'No major savings gap yet'}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
            {bestScenario?.detail || 'Add income and deduction details so TaxBee can simulate savings more accurately.'}
          </p>
          <p className="mt-4 text-2xl font-bold text-green-700">
            {bestScenario ? formatMoney(bestScenario.savingVsCurrent) : 'Not calculated'}
          </p>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {hasTaxData && recommendations.length > 0 ? recommendations.slice(0, 3).map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.detail}</p>
              <p className="mt-4 text-lg font-bold text-green-700">{formatMoney(item.impact || 0)}</p>
            </div>
          )) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm font-medium text-gray-600 shadow-sm md:col-span-3">
              Import AIS/Form 26AS or save income values before TaxBee shows savings estimates.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-800">Scenario Comparison</h2>
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr><th className="px-4 py-3">Scenario</th><th className="px-4 py-3">Tax</th><th className="px-4 py-3">Saving</th><th className="px-4 py-3">Why</th></tr>
              </thead>
              <tbody>
                {hasTaxData && scenarios.length > 0 ? scenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 font-bold text-gray-900">{scenario.label}</td>
                    <td className="px-4 py-3">{formatMoney(scenario.tax)}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{formatMoney(scenario.savingVsCurrent)}</td>
                    <td className="px-4 py-3 text-gray-600">{scenario.detail}</td>
                  </tr>
                )) : (
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>
                      No savings scenarios are shown until real income data is available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      <BeeAssistantProvider />
    </WorkspaceShell>
  );
}
