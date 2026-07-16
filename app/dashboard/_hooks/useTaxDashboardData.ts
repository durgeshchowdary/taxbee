"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/backend/utils/siteMap";
import { analyzeTaxContext, buildTaxIntelligence } from "@/backend/utils/taxEngine";
import { loadSession, logoutSession } from "@/app/_utils/authSession";

export type User = {
  name: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
};

export type AmountMap = Record<string, string | number | undefined>;
export type DraftState = {
  salary?: AmountMap;
  houseProperty?: AmountMap;
  pgbp?: AmountMap;
  capitalGains?: AmountMap;
  otherSources?: AmountMap;
};
export type AisImport = {
  fileName?: string;
  importedAt?: string;
  detectedSections?: string[];
  totals?: {
    tds?: number;
    interest?: number;
    dividend?: number;
    salary?: number;
    other?: number;
  };
} | null;
export type ExtractionReviewRecord = {
  id: string;
  source: string;
  label: string;
  path: string;
  value: string;
  originalValue: string;
  mappedSection: string;
  confidence: number;
  status: "extracted" | "confirmed" | "overridden";
  updatedAt: string;
};
export type SavingCard = {
  title: string;
  detail: string;
  impact: number;
};
export type TaxDriver = {
  label: string;
  amount: number;
  reason: string;
};
export type RegimeComparisonRow = {
  regime: string;
  taxableIncome: number;
  tax: number;
  decision: string;
};
export type ScenarioComparisonRow = {
  id: string;
  label: string;
  tax: number;
  savingVsCurrent: number;
  detail: string;
};
export type RiskBreakdownRow = {
  title: string;
  points: number;
  reason: string;
  action: string;
};
export type FilingStep = {
  title: string;
  status: "Done" | "In Progress" | "Pending" | "Locked";
  detail: string;
  route: string;
};
export type ActivityItem = {
  title: string;
  detail: string;
  status: "done" | "pending";
};
export type DocumentRow = {
  source: string;
  mapped: string;
  extracted: string;
};

type DashboardPayload = {
  user?: User;
  hasTaxData?: boolean;
  draft?: DraftState;
  deductions?: AmountMap;
  aisImport?: AisImport;
  imports?: unknown[];
  extractionReview?: ExtractionReviewRecord[];
  taxpayerProfile?: {
    panMasked?: string;
  };
  intelligence?: ReturnType<typeof buildTaxIntelligence>;
  taxIntelligence?: {
    calculationStatus?: {
      calculationStatus: string;
      reason: string;
    };
  };
  message?: string;
};

type DashboardResponse = {
  success?: boolean;
  message?: string;
  data?: DashboardPayload | null;
};

export const formatMoney = (value: number) =>
  `Rs. ${Math.round(value || 0).toLocaleString("en-IN")}`;

const hasAnyAmount = (value?: AmountMap) =>
  Boolean(
    value &&
      Object.values(value).some((item) => Number(String(item ?? "").replace(/,/g, "")) > 0)
  );

const countNamedAmounts = (value: AmountMap | undefined, keys: string[]) =>
  value
    ? keys.filter((key) => Number(String(value[key] ?? "").replace(/,/g, "")) > 0).length
    : 0;

const SALARY_INCOME_KEYS = [
  "salary17_1",
  "perquisites17_2",
  "profits17_3",
  "grossSalary",
  "basicSalary",
  "dearnessAllowance",
  "bonusCommission",
  "hraReceived",
  "ltaReceived",
  "overtimeAllowance",
  "advanceSalary",
  "arrearsOfSalary",
  "leaveSalaryDuringService",
  "pensionUncommuted",
  "feesWagesAnnuity",
  "otherAllowances",
  "rentFreeAccommodation",
  "carFacility",
  "interestFreeLoan",
  "esop",
  "freeGasElectricityWater",
  "freeEducation",
  "householdStaff",
  "creditCardExpenses",
  "clubExpenses",
  "giftTaxablePortion",
  "useTransferOfAssets",
  "employerContribution",
  "otherPerquisites",
  "compensationOnTermination",
  "retrenchmentCompensation",
  "keymanInsurance",
  "otherReceipts",
];
const HOUSE_PROPERTY_INCOME_KEYS = ["annualRent"];
const PGBP_INCOME_KEYS = ["businessReceipts", "otherBusinessIncome"];
const CAPITAL_GAINS_INCOME_KEYS = ["saleValue"];
const OTHER_SOURCES_INCOME_KEYS = ["savingsInterest", "fdInterest", "dividendIncome", "otherIncome"];

const hasDraftAmounts = (draft?: DraftState) =>
  Boolean(
    countNamedAmounts(draft?.salary, SALARY_INCOME_KEYS) ||
      countNamedAmounts(draft?.houseProperty, HOUSE_PROPERTY_INCOME_KEYS) ||
      countNamedAmounts(draft?.pgbp, PGBP_INCOME_KEYS) ||
      countNamedAmounts(draft?.capitalGains, CAPITAL_GAINS_INCOME_KEYS) ||
      countNamedAmounts(draft?.otherSources, OTHER_SOURCES_INCOME_KEYS)
  );

const nonZeroIncomeCount = (draft?: DraftState) =>
  countNamedAmounts(draft?.salary, SALARY_INCOME_KEYS) +
  countNamedAmounts(draft?.houseProperty, HOUSE_PROPERTY_INCOME_KEYS) +
  countNamedAmounts(draft?.pgbp, PGBP_INCOME_KEYS) +
  countNamedAmounts(draft?.capitalGains, CAPITAL_GAINS_INCOME_KEYS) +
  countNamedAmounts(draft?.otherSources, OTHER_SOURCES_INCOME_KEYS);

const draftSectionCount = (draft?: DraftState) =>
  [
    countNamedAmounts(draft?.salary, SALARY_INCOME_KEYS),
    countNamedAmounts(draft?.houseProperty, HOUSE_PROPERTY_INCOME_KEYS),
    countNamedAmounts(draft?.pgbp, PGBP_INCOME_KEYS),
    countNamedAmounts(draft?.capitalGains, CAPITAL_GAINS_INCOME_KEYS),
    countNamedAmounts(draft?.otherSources, OTHER_SOURCES_INCOME_KEYS),
  ].filter((count) => count > 0).length;

const hasAisImportData = (item?: AisImport) => Boolean(item && hasAnyAmount(item.totals));

const hasImportActivity = (item: unknown) => {
  if (!item || typeof item !== "object") return false;
  const record = item as { totals?: AmountMap; extractedFields?: Array<{ path?: string }> };
  return hasAnyAmount(record.totals) || Boolean(record.extractedFields?.some((field) => String(field.path || "").trim()));
};

const countImportActivity = (imports: unknown[] = []) =>
  imports.filter(hasImportActivity).length;

const hasMeaningfulTaxActivity = ({
  draft,
  deductions,
  aisImport,
  extractionReview = [],
  imports = [],
}: {
  draft?: DraftState;
  deductions?: AmountMap;
  aisImport?: AisImport;
  extractionReview?: ExtractionReviewRecord[];
  imports?: unknown[];
}) =>
  Boolean(
    countImportActivity(imports) > 0 ||
      hasAisImportData(aisImport) ||
      extractionReview.some((record) => record.status === "confirmed" || record.status === "overridden") ||
      hasAnyAmount(deductions) ||
      hasDraftAmounts(draft)
  );

const buildMeaningfulActivityDiagnostics = ({
  draft,
  deductions,
  aisImport,
  extractionReview = [],
  imports = [],
}: {
  draft?: DraftState;
  deductions?: AmountMap;
  aisImport?: AisImport;
  extractionReview?: ExtractionReviewRecord[];
  imports?: unknown[];
}) => ({
  importsCount: countImportActivity(imports),
  hasAisImportData: hasAisImportData(aisImport),
  confirmedFieldCount: extractionReview.filter(
    (record) => record.status === "confirmed" || record.status === "overridden"
  ).length,
  nonZeroIncomeCount: nonZeroIncomeCount(draft),
  deductionActivity: hasAnyAmount(deductions),
  draftSectionCount: draftSectionCount(draft),
});

const staleEmptyDraftLoadPattern = /Could not load ITR draft from MongoDB|database connection is healthy/i;
const isStaleEmptyDraftLoadMessage = (message = "") => staleEmptyDraftLoadPattern.test(message);
const EMPTY_DASHBOARD_MESSAGE = "Import documents or start your ITR draft to begin calculations.";

export function useTaxDashboardData() {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [selectedYear] = useState("2024-25");
  const [verifiedPan, setVerifiedPan] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({});
  const [deductions, setDeductions] = useState<AmountMap>({});
  const [aisImport, setAisImport] = useState<AisImport>(null);
  const [importCount, setImportCount] = useState(0);
  const [extractionReview, setExtractionReview] = useState<ExtractionReviewRecord[]>([]);
  const [backendIntelligence, setBackendIntelligence] = useState<ReturnType<typeof buildTaxIntelligence> | null>(null);
  const [calculationStatusReason, setCalculationStatusReason] = useState("");

  useEffect(() => {
    const calculateTax = async () => {
      try {
        const session = await loadSession();
        if (!session) {
          setUser(null);
          return;
        }
        if (session.requiresVerification) {
          router.replace("/verify-email");
          return;
        }
        if (!session.allowedPortals.includes("taxpayer")) {
          router.replace(session.allowedPortals.includes("reviewer") ? "/reviewer/workspaces" : "/login");
          return;
        }
        setUser(session.user);

        let backendPayload: DashboardPayload | null = null;

        try {
          setDashboardError("");
          const res = await fetch("/api/dashboard");
          const body = (await res.json()) as DashboardResponse;

          if (res.ok && body?.success !== false && body?.data) {
            backendPayload = body.data as DashboardPayload;
            setDashboardError("");
            if (process.env.NODE_ENV === "development") {
              const diagnostics = buildMeaningfulActivityDiagnostics({
                draft: backendPayload.draft,
                deductions: backendPayload.deductions,
                aisImport: backendPayload.aisImport,
                extractionReview: backendPayload.extractionReview,
                imports: backendPayload.imports,
              });
              console.debug("taxbee.dashboard.meaningfulActivity", {
                hasTaxData: backendPayload.hasTaxData,
                meaningfulActivity: hasMeaningfulTaxActivity({
                  draft: backendPayload.draft,
                  deductions: backendPayload.deductions,
                  aisImport: backendPayload.aisImport,
                  extractionReview: backendPayload.extractionReview,
                  imports: backendPayload.imports,
                }),
                ...diagnostics,
              });
            }
            if (
              backendPayload.hasTaxData === false ||
              !hasMeaningfulTaxActivity({
                draft: backendPayload.draft,
                deductions: backendPayload.deductions,
                aisImport: backendPayload.aisImport,
                extractionReview: backendPayload.extractionReview,
                imports: backendPayload.imports,
              })
            ) {
              setCalculationStatusReason(EMPTY_DASHBOARD_MESSAGE);
            }
          } else {
            setDashboardError(body?.message || "Dashboard backend returned an error.");
          }
        } catch {
          setDashboardError("Dashboard backend is not reachable. Tax data cannot be loaded.");
        }

        setDraft(backendPayload?.draft || {});
        setDeductions(backendPayload?.deductions || {});
        setAisImport(backendPayload?.aisImport || null);
        setImportCount(countImportActivity(backendPayload?.imports || []));
        setExtractionReview(backendPayload?.extractionReview || []);
        setVerifiedPan(backendPayload?.taxpayerProfile?.panMasked || null);
        setBackendIntelligence(backendPayload?.intelligence || null);
        setCalculationStatusReason(
          backendPayload?.hasTaxData === false ||
            !hasMeaningfulTaxActivity({
              draft: backendPayload?.draft,
              deductions: backendPayload?.deductions,
              aisImport: backendPayload?.aisImport,
              extractionReview: backendPayload?.extractionReview,
              imports: backendPayload?.imports,
            })
            ? EMPTY_DASHBOARD_MESSAGE
            : backendPayload?.taxIntelligence?.calculationStatus?.reason || backendPayload?.message || ""
        );
      } catch (error) {
        console.error("Error calculating tax summary", error);
        setDashboardError("Dashboard data could not be loaded.");
      } finally {
        setIsInitializing(false);
      }
    };

    calculateTax();
    window.addEventListener("taxbee:storage-updated", calculateTax);
    return () => window.removeEventListener("taxbee:storage-updated", calculateTax);
  }, [router]);

  useEffect(() => {
    if (!isInitializing && !user) {
      router.push("/login");
    }
  }, [user, isInitializing, router]);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    void logoutSession();
    setUser(null);
    setVerifiedPan(null);
    router.push("/login");
  };

  const analysis = useMemo(
    () => analyzeTaxContext({ currentDraft: draft, deductions }),
    [draft, deductions]
  );

  const fallbackIntelligence = useMemo(
    () => buildTaxIntelligence({ currentDraft: draft, deductions, aisImport }),
    [aisImport, deductions, draft]
  );
  const intelligence = backendIntelligence || fallbackIntelligence;

  const bestCurrentTax = Math.min(
    intelligence.analysis.tax.oldRegimeEstimatedTax,
    intelligence.analysis.tax.newRegimeEstimatedTax
  );
  const hasMeaningfulActivity = hasMeaningfulTaxActivity({
    draft,
    deductions,
    aisImport,
    extractionReview,
    imports: Array.from({ length: importCount }, () => ({ extractedFields: [{ path: "import" }] })),
  });
  const hasTaxData = hasMeaningfulActivity;
  const visibleDashboardError =
    !hasTaxData && isStaleEmptyDraftLoadMessage(dashboardError) ? "" : dashboardError;
  const visibleCalculationStatusReason =
    !hasMeaningfulActivity
      ? EMPTY_DASHBOARD_MESSAGE
      : !hasTaxData && isStaleEmptyDraftLoadMessage(calculationStatusReason)
        ? EMPTY_DASHBOARD_MESSAGE
        : calculationStatusReason;
  const canEstimateTax = intelligence.analysis.income.grossTotalIncome > 0;
  const canReconcileRefund = canEstimateTax && Boolean(aisImport?.totals?.tds);
  const taxPaid = Math.round(Number(aisImport?.totals?.tds || 0));
  const refundOrDue = taxPaid - bestCurrentTax;
  const completionPercent = hasTaxData ? intelligence.dataQuality.score : 0;
  const healthTone =
    !hasTaxData
      ? "text-gray-500"
      : intelligence.health.score >= 80
        ? "text-green-600"
        : intelligence.health.score >= 60
          ? "text-blue-600"
          : intelligence.health.score >= 40
            ? "text-orange-500"
            : "text-red-500";
  const refundTone = refundOrDue >= 0 ? "text-green-600" : "text-red-500";
  const refundLabel = refundOrDue >= 0 ? "Refund" : "Tax Due";
  const chosenRegime =
    intelligence.analysis.tax.betterRegime === "same"
      ? "Either"
      : intelligence.analysis.tax.betterRegime === "old"
        ? "Old"
        : "New";

  const filingProgress: FilingStep[] = [
    {
      title: "Import Data",
      status: aisImport ? "Done" : "Pending",
      detail: aisImport?.fileName || "Upload AIS/Form 26AS or enter Form 16 data",
      route: "/import-data",
    },
    {
      title: "Review Income",
      status: analysis.income.grossTotalIncome > 0 ? "In Progress" : "Pending",
      detail: analysis.income.grossTotalIncome > 0
        ? `${formatMoney(analysis.income.grossTotalIncome)} mapped so far`
        : "No confirmed income values are available yet",
      route: "/file-your-itr",
    },
    {
      title: "Claim Deductions",
      status: analysis.deductions.oldRegimeDeductions > 0 ? "In Progress" : "Pending",
      detail: analysis.deductions.oldRegimeDeductions > 0
        ? `${formatMoney(analysis.deductions.oldRegimeDeductions)} deductions entered`
        : "Add eligible deductions when you have proof",
      route: "/deductions",
    },
    {
      title: "Final Review",
      status: !hasTaxData ? "Locked" : intelligence.anomalies.score >= 35 ? "In Progress" : "Done",
      detail: !hasTaxData
        ? "Import or enter tax data before final review"
        : intelligence.anomalies.flags[0]?.message || "No major issue found",
      route: "/dashboard",
    },
  ];

  const savingCards = canEstimateTax
    ? intelligence.recommendations.filter((item): item is SavingCard => Boolean(item)).slice(0, 3)
    : [];
  const planningScenarios = canEstimateTax ? intelligence.nextYear.scenarios.slice(0, 4) : [];
  const taxDrivers = intelligence.explanation.taxDrivers as TaxDriver[];
  const regimeComparison = intelligence.explanation.regimeComparison as RegimeComparisonRow[];
  const scenarioComparison = intelligence.explanation.scenarioComparison as ScenarioComparisonRow[];
  const riskBreakdown = intelligence.explanation.riskBreakdown as RiskBreakdownRow[];
  const unconfirmedExtractions = extractionReview.filter((record) => record.status === "extracted");
  const bestSavingScenario = scenarioComparison
    .filter((scenario) => scenario.savingVsCurrent > 0)
    .sort((a, b) => b.savingVsCurrent - a.savingVsCurrent)[0];
  const bestAction = !hasTaxData
    ? {
        title: "Connect your tax data",
        detail: "Import AIS/Form 26AS to unlock accurate tax calculations.",
        route: "/import-data",
        cta: "Import Data",
        saving: 0,
        riskReduction: 0,
      }
    : unconfirmedExtractions.length
      ? {
          title: "Confirm extracted tax fields",
          detail: `${unconfirmedExtractions.length} extracted field${unconfirmedExtractions.length === 1 ? "" : "s"} need review before TaxBee can fully trust them.`,
          route: "/import-data",
          cta: "Review Fields",
          saving: 0,
          riskReduction: Math.min(25, unconfirmedExtractions.length * 5),
        }
      : bestSavingScenario
        ? {
            title: bestSavingScenario.label,
            detail: bestSavingScenario.detail,
            route: "/deductions",
            cta: "Review Savings",
            saving: bestSavingScenario.savingVsCurrent,
            riskReduction: riskBreakdown[0]?.points || 0,
          }
        : riskBreakdown[0]
          ? {
              title: riskBreakdown[0].action,
              detail: riskBreakdown[0].reason,
              route: "/import-data",
              cta: "Reduce Risk",
              saving: 0,
              riskReduction: riskBreakdown[0].points,
            }
          : {
              title: "Review final regime decision",
              detail: intelligence.explanation.headline,
              route: "/insights",
              cta: "View Insights",
              saving: 0,
              riskReduction: 0,
            };

  const activities: ActivityItem[] = [
    {
      title: aisImport ? "Imported AIS" : "AIS not imported",
      detail: aisImport?.fileName || "Import Form 26AS or AIS to begin",
      status: aisImport ? "done" : "pending",
    },
    {
      title: intelligence.analysis.deductions.oldRegimeDeductions > 0 ? "Added deductions" : "Deductions pending",
      detail:
        intelligence.analysis.deductions.oldRegimeDeductions > 0
          ? `${formatMoney(intelligence.analysis.deductions.oldRegimeDeductions)} entered`
          : "Add eligible deductions with proof",
      status: intelligence.analysis.deductions.oldRegimeDeductions > 0 ? "done" : "pending",
    },
    {
      title: intelligence.analysis.income.grossTotalIncome > 0 ? "Generated draft" : "Draft not ready",
      detail:
        intelligence.analysis.income.grossTotalIncome > 0
          ? `${formatMoney(intelligence.analysis.income.grossTotalIncome)} income mapped`
          : "Income details are required",
      status: intelligence.analysis.income.grossTotalIncome > 0 ? "done" : "pending",
    },
    {
      title:
        !hasTaxData
          ? "Review unavailable"
          : intelligence.anomalies.flags.length > 0
            ? "Reviewed document"
            : "Review checks clear",
      detail:
        !hasTaxData
          ? "Import tax data before review"
          : intelligence.anomalies.flags.length > 0
            ? `${intelligence.anomalies.flags.length} item(s) need attention`
            : "No major review flags",
      status: hasTaxData && intelligence.anomalies.flags.length === 0 ? "done" : "pending",
    },
  ];

  const documentRows: DocumentRow[] = aisImport
    ? extractionReview.length > 0
      ? extractionReview.slice(0, 6).map((record) => ({
          source: record.source,
          mapped: `${record.label} -> ${record.mappedSection}`,
          extracted: `${formatMoney(Number(record.value || 0))} | confidence ${record.confidence}% | ${record.status}`,
        }))
      : [
          {
            source: aisImport.fileName || "AIS / Form 26AS",
            mapped: aisImport.detectedSections?.length
              ? aisImport.detectedSections.join(", ")
              : "Detected sections unavailable",
            extracted: [
              ["TDS", aisImport.totals?.tds],
              ["Salary", aisImport.totals?.salary],
              ["Interest", aisImport.totals?.interest],
              ["Dividend", aisImport.totals?.dividend],
            ]
              .filter(([, value]) => Number(value || 0) > 0)
              .map(([label, value]) => `${label}: ${formatMoney(Number(value || 0))}`)
              .join(" | ") || "No high-confidence totals extracted",
          },
        ]
    : [];

  return {
    router,
    isInitializing,
    user,
    selectedYear,
    verifiedPan,
    handleLogout,
    visibleDashboardError,
    visibleCalculationStatusReason,
    analysis,
    intelligence,
    bestCurrentTax,
    hasTaxData,
    canEstimateTax,
    canReconcileRefund,
    taxPaid,
    refundOrDue,
    completionPercent,
    healthTone,
    refundTone,
    refundLabel,
    chosenRegime,
    filingProgress,
    savingCards,
    planningScenarios,
    taxDrivers,
    regimeComparison,
    scenarioComparison,
    riskBreakdown,
    extractionReview,
    bestAction,
    activities,
    documentRows,
  };
}
