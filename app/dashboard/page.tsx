"use client";

import BeeAssistantProvider from "@/components/BeeAssistantProvider";
import {
  ActionCenterCard,
  DashboardHero,
  DashboardShell,
  FilingProgress,
  InsightsPreview,
  LoadingDashboard,
  QuickActions,
  RecentActivity,
  StatCard,
} from "./_components/DashboardComponents";
import { formatMoney, useTaxDashboardData } from "./_hooks/useTaxDashboardData";

export default function DashboardPage() {
  const dashboard = useTaxDashboardData();

  if (dashboard.isInitializing || !dashboard.user) {
    return <LoadingDashboard />;
  }

  const notice = dashboard.visibleDashboardError || dashboard.visibleCalculationStatusReason;
  const filingStatus = dashboard.hasTaxData ? "In Progress" : "Not Started";
  const filingDescription = dashboard.hasTaxData
    ? "Your return has enough data for TaxBee to guide the next step."
    : "Import data or start an ITR draft to begin filing.";
  const refundValue = dashboard.canReconcileRefund
    ? formatMoney(Math.abs(dashboard.refundOrDue))
    : "Not calculated";
  const refundDescription = dashboard.canReconcileRefund
    ? `${dashboard.refundLabel} based on imported TDS of ${formatMoney(dashboard.taxPaid)}.`
    : "Needs income data and imported TDS credits.";
  const savingsSummary = dashboard.savingCards[0]
    ? `${dashboard.savingCards[0].title}: ${dashboard.savingCards[0].detail}`
    : "Add income, deductions, and tax statement data to unlock targeted savings.";
  const riskSummary = dashboard.hasTaxData
    ? dashboard.riskBreakdown[0]?.reason || "No major issue found in the fields TaxBee tracks."
    : "Import or enter tax data before TaxBee runs anomaly checks.";
  const regimeSummary = dashboard.canEstimateTax
    ? `${dashboard.chosenRegime} regime currently looks better based on available data.`
    : "Add confirmed income values to compare old and new regimes.";

  return (
    <DashboardShell user={dashboard.user} onLogout={dashboard.handleLogout}>
      <DashboardHero
        userName={dashboard.user.name}
        selectedYear={dashboard.selectedYear}
        verifiedPan={dashboard.verifiedPan}
        subscriptionStatus="Subscription Active"
        notice={notice}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="ITR Filing Status"
          value={filingStatus}
          description={filingDescription}
          toneClassName={dashboard.hasTaxData ? "text-blue-600" : "text-orange-500"}
        />
        <StatCard
          label="Tax Health Score"
          value={dashboard.hasTaxData ? `${dashboard.intelligence.health.score}/100` : "Not calculated"}
          description={
            dashboard.hasTaxData
              ? dashboard.intelligence.health.summary
              : "Import AIS/Form 26AS or save an ITR draft before TaxBee can score filing health."
          }
          toneClassName={dashboard.healthTone}
        />
        <StatCard
          label="Refund / Due"
          value={refundValue}
          description={refundDescription}
          toneClassName={dashboard.canReconcileRefund ? dashboard.refundTone : "text-gray-500"}
        />
        <StatCard
          label="Completion"
          value={`${dashboard.completionPercent}%`}
          description="Progress is based on source data quality and completed filing checks."
          toneClassName="text-gray-900"
        />
      </div>

      <ActionCenterCard
        title={dashboard.bestAction.title}
        detail={dashboard.bestAction.detail}
        saving={formatMoney(dashboard.bestAction.saving)}
        riskReduction={
          dashboard.bestAction.riskReduction > 0
            ? `${dashboard.bestAction.riskReduction} points`
            : "No active risk reduction"
        }
        cta={dashboard.bestAction.cta}
        onAction={() => dashboard.router.push(dashboard.bestAction.route)}
      />

      <QuickActions onNavigate={(route) => dashboard.router.push(route)} />

      <FilingProgress
        steps={dashboard.filingProgress}
        onNavigate={(route) => dashboard.router.push(route)}
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <RecentActivity activities={dashboard.activities} />
        <InsightsPreview
          savingsSummary={savingsSummary}
          riskSummary={riskSummary}
          regimeSummary={regimeSummary}
          onViewDetails={() => dashboard.router.push("/insights")}
        />
      </div>

      <BeeAssistantProvider />
    </DashboardShell>
  );
}
