"use client";

import BeeAssistantProvider from "@/components/BeeAssistantProvider";
import {
  DashboardShell,
  LoadingDashboard,
  PageSection,
} from "../dashboard/_components/DashboardComponents";
import { formatMoney, useTaxDashboardData } from "../dashboard/_hooks/useTaxDashboardData";

export default function InsightsPage() {
  const dashboard = useTaxDashboardData();

  if (dashboard.isInitializing || !dashboard.user) {
    return <LoadingDashboard />;
  }

  return (
    <DashboardShell user={dashboard.user} onLogout={dashboard.handleLogout}>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Tax Insights</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-gray-600">
          Deeper explanations, comparisons, risk signals, planning scenarios, and document intelligence for FY {dashboard.selectedYear}.
        </p>
      </section>

      <PageSection
        title="Tax Explanation Engine"
        description={
          dashboard.canEstimateTax
            ? dashboard.intelligence.explanation.headline
            : "TaxBee will explain calculations after income and source data are available."
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboard.canEstimateTax ? (
            dashboard.taxDrivers.map((driver) => (
              <article key={driver.label} className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <h3 className="font-bold text-gray-900">{driver.label}</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(driver.amount)}</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{driver.reason}</p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-gray-600 md:col-span-2 xl:col-span-5">
              No calculation drivers are shown until real income values exist.
            </p>
          )}
        </div>
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection title="Regime Comparison" description="Old and new regime estimates based on current saved data.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-slate-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-bold">Regime</th>
                  <th className="px-4 py-3 font-bold">Taxable Income</th>
                  <th className="px-4 py-3 font-bold">Tax</th>
                  <th className="px-4 py-3 font-bold">Decision</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.canEstimateTax ? (
                  dashboard.regimeComparison.map((row) => (
                    <tr key={row.regime} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3 font-bold text-gray-900">{row.regime}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMoney(row.taxableIncome)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMoney(row.tax)}</td>
                      <td className="px-4 py-3 text-gray-600">{row.decision}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                      Add income data to compare regimes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        <PageSection title="Scenario Comparison" description="Savings scenarios generated from current tax context.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-slate-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-bold">Scenario</th>
                  <th className="px-4 py-3 font-bold">Tax</th>
                  <th className="px-4 py-3 font-bold">Saving</th>
                  <th className="px-4 py-3 font-bold">Why</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.canEstimateTax ? (
                  dashboard.scenarioComparison.map((scenario) => (
                    <tr key={scenario.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3 font-bold text-gray-900">{scenario.label}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMoney(scenario.tax)}</td>
                      <td className="px-4 py-3 font-bold text-green-600">{formatMoney(scenario.savingVsCurrent)}</td>
                      <td className="px-4 py-3 text-gray-600">{scenario.detail}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                      Savings scenarios need real income and deduction values.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PageSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PageSection
          title="Risk Breakdown"
          description={
            dashboard.hasTaxData
              ? `Current risk score is ${dashboard.intelligence.anomalies.score}/100.`
              : "Import or enter tax data before TaxBee runs anomaly checks."
          }
        >
          <div className="space-y-3">
            {dashboard.hasTaxData && dashboard.riskBreakdown.length > 0 ? (
              dashboard.riskBreakdown.map((risk, index) => (
                <article key={`${risk.title}-${index}`} className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{risk.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-700">{risk.reason}</p>
                      <p className="mt-2 text-sm font-bold text-orange-700">Fix: {risk.action}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-orange-500 ring-1 ring-orange-200">
                      +{risk.points}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-gray-600">
                {dashboard.hasTaxData
                  ? "No major issue found in the fields TaxBee tracks."
                  : "Import or enter tax data before TaxBee runs anomaly checks."}
              </p>
            )}
          </div>
        </PageSection>

        <PageSection
          title="Future Planning"
          description={
            dashboard.canEstimateTax
              ? "Estimate based on 10% income growth and common deduction scenarios."
              : "Planning estimates unlock after TaxBee has real income values."
          }
          action={
            <span className="rounded-xl bg-yellow-100 px-3 py-2 text-sm font-bold text-gray-900">
              Best: {dashboard.canEstimateTax ? formatMoney(dashboard.intelligence.nextYear.bestTax) : "Not calculated"}
            </span>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.planningScenarios.length > 0 ? (
              dashboard.planningScenarios.map((scenario) => (
                <article key={scenario.id} className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                  <h3 className="font-bold text-gray-900">{scenario.label}</h3>
                  <p className="mt-3 text-2xl font-bold text-blue-600">{formatMoney(scenario.tax)}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{scenario.detail}</p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-gray-600">
                No projected scenarios are shown without real current-year data.
              </p>
            )}
          </div>
        </PageSection>
      </div>

      <PageSection
        title="Document Intelligence"
        description="Imported source documents, mapped sections, and extracted totals."
        action={
          <button
            onClick={() => dashboard.router.push("/import-data")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Import / Review
          </button>
        }
      >
        <div className="space-y-3">
          {dashboard.documentRows.length > 0 ? (
            dashboard.documentRows.map((row) => (
              <article key={row.source} className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[0.9fr_1.2fr_1.2fr]">
                  <div>
                    <h3 className="font-bold text-gray-900">Source</h3>
                    <p className="mt-1 text-sm text-gray-700">{row.source}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Mapped Sections</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-700">{row.mapped}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Extracted Totals</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-700">{row.extracted}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-gray-600">
              No source document has been imported yet. Upload AIS/Form 26AS to auto-map income, TDS, and review flags.
            </p>
          )}
        </div>
      </PageSection>

      <PageSection title="Advanced Tax Analytics" description="High-level calculation health and current estimate summary.">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
            <h3 className="font-bold text-gray-900">Gross Total Income</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(dashboard.analysis.income.grossTotalIncome)}</p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
            <h3 className="font-bold text-gray-900">Deductions</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(dashboard.analysis.deductions.oldRegimeDeductions)}</p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
            <h3 className="font-bold text-gray-900">Tax Payable</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {dashboard.canEstimateTax ? formatMoney(dashboard.bestCurrentTax) : "Not calculated"}
            </p>
          </article>
        </div>
      </PageSection>

      <BeeAssistantProvider />
    </DashboardShell>
  );
}
