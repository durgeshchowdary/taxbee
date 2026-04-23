"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/backend/utils/siteMap";
import { analyzeTaxContext, buildTaxIntelligence } from "@/backend/utils/taxEngine";
import BeeAssistantProvider from "@/components/BeeAssistantProvider";

type User = {
  name: string;
};

type AmountMap = Record<string, string | number | undefined>;
type DraftState = {
  salary?: AmountMap;
  houseProperty?: AmountMap;
  pgbp?: AmountMap;
  capitalGains?: AmountMap;
  otherSources?: AmountMap;
};
type AisImport = {
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
type SavingCard = {
  title: string;
  detail: string;
  impact: number;
};
type TaxDriver = {
  label: string;
  amount: number;
  reason: string;
};
type RegimeComparisonRow = {
  regime: string;
  taxableIncome: number;
  tax: number;
  decision: string;
};
type ScenarioComparisonRow = {
  id: string;
  label: string;
  tax: number;
  savingVsCurrent: number;
  detail: string;
};
type RiskBreakdownRow = {
  title: string;
  points: number;
  reason: string;
  action: string;
};
type ExtractionReviewRecord = {
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
type QuickActionIcon = "itr" | "import" | "download" | "help";
type SidebarIcon = "dashboard" | "file" | "savings" | "documents" | "help";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const formatMoney = (value: number) =>
  `Rs. ${Math.round(value || 0).toLocaleString("en-IN")}`;

const isValidPan = (value: string | null) =>
  Boolean(value && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase()));

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showCalculation, setShowCalculation] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [selectedYear] = useState("2024-25");
  const [verifiedPan, setVerifiedPan] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({});
  const [deductions, setDeductions] = useState<AmountMap>({});
  const [aisImport, setAisImport] = useState<AisImport>(null);
  const [extractionReview, setExtractionReview] = useState<ExtractionReviewRecord[]>([]);

  useEffect(() => {
    const calculateTax = () => {
      try {
        const token = localStorage.getItem("token");
        const storedUserStr = localStorage.getItem(STORAGE_KEYS.USER);
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
        setUser(token && storedUser ? storedUser : null);

        const storedPan = localStorage.getItem(STORAGE_KEYS.VERIFIED_PAN);
        if (isValidPan(storedPan)) {
          setVerifiedPan(storedPan?.trim().toUpperCase() || null);
        } else {
          setVerifiedPan(null);
          if (storedPan) localStorage.removeItem(STORAGE_KEYS.VERIFIED_PAN);
        }

        const savedDraft = readJson<DraftState>(STORAGE_KEYS.ITR_DRAFT, {});
        const savedDeductions = readJson<AmountMap>(STORAGE_KEYS.DEDUCTIONS, {});
        const savedAisImport = readJson<AisImport>(STORAGE_KEYS.AIS_IMPORT, null);
        const savedExtractionReview = readJson<ExtractionReviewRecord[]>(
          STORAGE_KEYS.EXTRACTION_REVIEW,
          []
        );
        setDraft(savedDraft);
        setDeductions(savedDeductions);
        setAisImport(savedAisImport);
        setExtractionReview(savedExtractionReview);

      } catch (error) {
        console.error("Error calculating tax summary", error);
      } finally {
        setIsInitializing(false);
      }
    };

    calculateTax();
    window.addEventListener("taxbee:storage-updated", calculateTax);
    return () => window.removeEventListener("taxbee:storage-updated", calculateTax);
  }, []);

  useEffect(() => {
    if (!isInitializing && !user) {
      router.push("/login");
    }
  }, [user, isInitializing, router]);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AIS_IMPORT);
    localStorage.removeItem(STORAGE_KEYS.VERIFIED_PAN);
    localStorage.removeItem(STORAGE_KEYS.TAXPAYER_PROFILE);
    localStorage.removeItem("token");
    setUser(null);
    setVerifiedPan(null);
    router.push("/login");
  };

  const analysis = useMemo(
    () => analyzeTaxContext({ currentDraft: draft, deductions }),
    [draft, deductions]
  );

  const intelligence = useMemo(
    () => buildTaxIntelligence({ currentDraft: draft, deductions, aisImport }),
    [aisImport, deductions, draft]
  );

  const bestCurrentTax = Math.min(
    intelligence.analysis.tax.oldRegimeEstimatedTax,
    intelligence.analysis.tax.newRegimeEstimatedTax
  );
  const taxPaid = Math.round(Number(aisImport?.totals?.tds || 0));
  const refundOrDue = taxPaid - bestCurrentTax;
  const completionPercent = Math.round(
    ([
      Boolean(aisImport),
      intelligence.analysis.income.grossTotalIncome > 0,
      intelligence.analysis.deductions.oldRegimeDeductions > 0,
      intelligence.anomalies.flags.length === 0,
    ].filter(Boolean).length /
      4) *
      100
  );
  const healthTone =
    intelligence.health.score >= 80
      ? "text-green-600"
      : intelligence.health.score >= 60
        ? "text-blue-600"
        : intelligence.health.score >= 40
          ? "text-orange-500"
          : "text-red-600";
  const refundTone = refundOrDue >= 0 ? "text-green-600" : "text-red-600";
  const refundLabel = refundOrDue >= 0 ? "Refund" : "Tax Due";
  const chosenRegime =
    intelligence.analysis.tax.betterRegime === "same"
      ? "Either"
      : intelligence.analysis.tax.betterRegime === "old"
        ? "Old"
        : "New";

  const filingProgress = [
    {
      title: "Import documents",
      status: aisImport ? "Done" : "Pending",
      detail: aisImport?.fileName || "Upload AIS/Form 26AS or enter Form 16 data",
      route: "/import-data",
    },
    {
      title: "Review income",
      status: analysis.income.grossTotalIncome > 0 ? "Started" : "Pending",
      detail: `${formatMoney(analysis.income.grossTotalIncome)} mapped so far`,
      route: "/file-your-itr",
    },
    {
      title: "Claim deductions",
      status: analysis.deductions.oldRegimeDeductions > 0 ? "Started" : "Open",
      detail: `${formatMoney(analysis.deductions.oldRegimeDeductions)} deductions entered`,
      route: "/deductions",
    },
    {
      title: "Final check",
      status: intelligence.anomalies.score >= 35 ? "Review" : "Clear",
      detail: intelligence.anomalies.flags[0]?.message || "No major issue found",
      route: "/dashboard",
    },
  ];

  const savingCards = intelligence.recommendations.filter(
    (item): item is SavingCard => Boolean(item)
  ).slice(0, 3);
  const planningScenarios = intelligence.nextYear.scenarios.slice(0, 4);
  const taxDrivers = intelligence.explanation.taxDrivers as TaxDriver[];
  const regimeComparison = intelligence.explanation.regimeComparison as RegimeComparisonRow[];
  const scenarioComparison = intelligence.explanation.scenarioComparison as ScenarioComparisonRow[];
  const riskBreakdown = intelligence.explanation.riskBreakdown as RiskBreakdownRow[];
  const unconfirmedExtractions = extractionReview.filter((record) => record.status === "extracted");
  const bestAction = unconfirmedExtractions.length
    ? {
        title: "Confirm extracted tax fields",
        detail: `${unconfirmedExtractions.length} extracted field${unconfirmedExtractions.length === 1 ? "" : "s"} still need human review before TaxBee should fully trust them.`,
        route: "/import-data",
        saving: 0,
        riskReduction: Math.min(25, unconfirmedExtractions.length * 5),
      }
    : scenarioComparison.find((scenario) => scenario.savingVsCurrent > 0)
      ? {
          title: scenarioComparison
            .filter((scenario) => scenario.savingVsCurrent > 0)
            .sort((a, b) => b.savingVsCurrent - a.savingVsCurrent)[0].label,
          detail: scenarioComparison
            .filter((scenario) => scenario.savingVsCurrent > 0)
            .sort((a, b) => b.savingVsCurrent - a.savingVsCurrent)[0].detail,
          route: "/deductions",
          saving: scenarioComparison
            .filter((scenario) => scenario.savingVsCurrent > 0)
            .sort((a, b) => b.savingVsCurrent - a.savingVsCurrent)[0].savingVsCurrent,
          riskReduction: riskBreakdown[0]?.points || 0,
        }
      : riskBreakdown[0]
        ? {
            title: riskBreakdown[0].action,
            detail: riskBreakdown[0].reason,
            route: "/import-data",
            saving: 0,
            riskReduction: riskBreakdown[0].points,
          }
        : {
            title: "Review final regime decision",
            detail: intelligence.explanation.headline,
            route: "/dashboard",
            saving: 0,
            riskReduction: 0,
          };

  const sidebarItems = [
    { icon: "dashboard" as SidebarIcon, label: "Dashboard", route: "/dashboard" },
    { icon: "file" as SidebarIcon, label: "File Tax", route: "/file-tax" },
    { icon: "savings" as SidebarIcon, label: "Tax Savings", route: "/tax-savings" },
    { icon: "documents" as SidebarIcon, label: "Documents", route: "/documents" },
    { icon: "help" as SidebarIcon, label: "Help", route: "/help" },
  ];

  const quickActions = [
    { icon: "itr" as QuickActionIcon, label: "Start New ITR Filing", route: "/file-your-itr", color: "bg-orange-500" },
    { icon: "import" as QuickActionIcon, label: "Import Data (Form 26AS / AIS)", route: "/import-data", color: "bg-blue-600" },
    { icon: "download" as QuickActionIcon, label: "Download Filed ITR", route: "/documents", color: "bg-green-600" },
    { icon: "help" as QuickActionIcon, label: "Assistance Filing", route: "/help", color: "bg-red-500" },
  ];

  const suggestions =
    savingCards.length > 0
      ? savingCards.map((item) => item.detail)
      : intelligence.analysis.recommendations.slice(0, 3);

  const activities = [
    {
      text: aisImport
        ? `Imported ${aisImport.fileName || "AIS/Form 26AS"}`
        : "AIS/Form 26AS not imported",
      status: aisImport ? "done" : "pending",
    },
    {
      text:
        intelligence.analysis.income.grossTotalIncome > 0
          ? `${formatMoney(intelligence.analysis.income.grossTotalIncome)} income mapped`
          : "Income details not mapped",
      status: intelligence.analysis.income.grossTotalIncome > 0 ? "done" : "pending",
    },
    {
      text:
        intelligence.analysis.deductions.oldRegimeDeductions > 0
          ? `${formatMoney(intelligence.analysis.deductions.oldRegimeDeductions)} deductions entered`
          : "Deductions not entered",
      status: intelligence.analysis.deductions.oldRegimeDeductions > 0 ? "done" : "pending",
    },
    {
      text:
        intelligence.anomalies.flags.length > 0
          ? `${intelligence.anomalies.flags.length} review item(s) pending`
          : "No major review flags",
      status: intelligence.anomalies.flags.length > 0 ? "pending" : "done",
    },
  ];

  const documentRows = aisImport
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

  const renderQuickActionIcon = (icon: QuickActionIcon) => {
    const iconClass = "h-7 w-7";

    if (icon === "itr") {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.5 12h5M9.5 15h5M9.5 18h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === "import") {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M12 3v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 16v3h14v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 6.5h3M14.5 6.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === "download") {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M6 3h9l3 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 12v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m8.5 15.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
        <path d="M5 18v-6a7 7 0 0 1 14 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 18h3v-5H5v5ZM16 18h3v-5h-3v5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 20h4c2 0 3-.8 3-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  };

  const renderSidebarIcon = (icon: SidebarIcon) => {
    const iconClass = "h-4.5 w-4.5";

    if (icon === "dashboard") {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M4 5h7v6H4V5ZM13 5h7v4h-7V5ZM13 11h7v8h-7v-8ZM4 13h7v6H4v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    }

    if (icon === "file") {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.5 13h5M9.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === "savings") {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M6 11c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5-2.7 5.5-6 5.5S6 14 6 11Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v6M9.5 10h3.8a1.7 1.7 0 0 1 0 3.4H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 18.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === "documents") {
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

  if (isInitializing || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700 shadow-sm">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <aside className="fixed flex h-full w-64 flex-col border-r border-gray-800 bg-[#0f172a] px-4 py-5 text-white shadow-2xl">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-7 flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-yellow-400/20 ring-2 ring-yellow-400/70">
            <Image
              src="/logo.jpg"
              alt="TaxBee logo"
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority
            />
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
                  ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/15"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex h-8 w-10 items-center justify-center rounded-lg ${
                  pathname === item.route
                    ? "bg-black/10 text-black"
                    : "bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white"
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
          <p className="mt-1 truncate text-sm font-bold text-white">{user.name || "TaxBee user"}</p>
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
            Welcome, {user.name || "User"}!
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Financial Year : {selectedYear}
            <span className="mx-2">|</span>
            PAN: {verifiedPan || "Not Verified"}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-semibold text-gray-700">
              ITR Filing Status: <span className="text-orange-500">Not Filed</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-semibold text-gray-700">
              Tax Health Score: <span className={healthTone}>{intelligence.health.score}/100</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {intelligence.health.summary}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-semibold text-gray-700">
              {refundLabel}: <span className={refundTone}>{formatMoney(Math.abs(refundOrDue))}</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Based on imported TDS of {formatMoney(taxPaid)} and best-regime tax estimate.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
                Best Action Right Now
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900">{bestAction.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">{bestAction.detail}</p>
            </div>
            <button
              onClick={() => router.push(bestAction.route)}
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800"
            >
              Take action
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4 ring-1 ring-yellow-200">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Estimated tax impact</p>
              <p className="mt-2 text-2xl font-bold text-green-700">{formatMoney(bestAction.saving)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 ring-1 ring-yellow-200">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Possible risk reduction</p>
              <p className="mt-2 text-2xl font-bold text-orange-600">
                {bestAction.riskReduction > 0 ? `${bestAction.riskReduction} points` : "No active risk reduction"}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">Quick Actions</h2>

          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.route)}
                className={`${item.color} flex min-h-[98px] items-center gap-4 rounded-xl px-5 py-4 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:opacity-95 hover:shadow-lg`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/25">
                  {renderQuickActionIcon(item.icon)}
                </span>
                <span className="text-base font-bold leading-snug">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-800">Tax Summary</h2>
            <div className="h-2 flex-1 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-700">{completionPercent}% ready</span>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t border-gray-200 pt-6 text-center">
            <div>
              <p className="mb-2 text-lg text-gray-500">Total Income:</p>
              <p className="text-4xl font-bold text-gray-800">
                {formatMoney(analysis.income.grossTotalIncome)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-lg text-gray-500">Deductions:</p>
              <p className="text-4xl font-bold text-gray-800">
                {formatMoney(analysis.deductions.oldRegimeDeductions)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-lg text-gray-500">Tax Payable:</p>
              <p className="text-4xl font-bold text-gray-800">
                {formatMoney(bestCurrentTax)}
              </p>
              <p className="mt-1 text-sm font-semibold text-blue-700">{chosenRegime} regime estimate</p>
            </div>

            <div>
              <p className="mb-2 text-lg text-gray-500">Refund / Due:</p>
              <p className={`text-4xl font-bold ${refundTone}`}>{formatMoney(Math.abs(refundOrDue))}</p>
              <p className="mt-1 text-sm font-semibold text-gray-500">{refundLabel}</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setShowCalculation((value) => !value)}
              className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow hover:bg-blue-700"
            >
              {showCalculation ? "Hide Detailed Calculation" : "View Detailed Calculation"}
            </button>
          </div>

          {showCalculation && (
            <div className="mt-6 grid gap-4 border-t border-gray-200 pt-5 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-bold text-gray-900">Why this tax?</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Old regime taxable income is {formatMoney(analysis.tax.oldRegimeTaxableIncome)} and estimated tax is {formatMoney(analysis.tax.oldRegimeEstimatedTax)}.
                  New regime taxable income is {formatMoney(analysis.tax.newRegimeTaxableIncome)} and estimated tax is {formatMoney(analysis.tax.newRegimeEstimatedTax)}.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-bold text-gray-900">Why this score?</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {intelligence.health.penalties[0]?.reason || "No major penalty found."}
                  {intelligence.health.penalties[0]?.action ? ` ${intelligence.health.penalties[0].action}` : ""}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-bold text-gray-900">Why this refund/due?</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  TaxBee compares imported TDS of {formatMoney(taxPaid)} against estimated payable tax of {formatMoney(bestCurrentTax)}.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-gray-800">
            Smart Tax Saving Suggestions
          </h2>

          <div className="space-y-4 border-t border-gray-200 pt-5">
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <div key={item} className="flex items-start gap-3 text-xl text-gray-700">
                  <span className="mt-0.5 text-green-600">OK</span>
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-gray-600">
                Add income, AIS/Form 26AS, and deductions to unlock personalized suggestions.
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Tax Explanation Engine</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {intelligence.explanation.headline}
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              Explainable
            </span>
          </div>

          <div className="grid gap-4 border-t border-gray-200 pt-5 md:grid-cols-5">
            {taxDrivers.map((driver) => (
              <div key={driver.label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{driver.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(driver.amount)}</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{driver.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-3xl font-bold text-gray-800">Regime Decision</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Regime</th>
                    <th className="px-4 py-3">Taxable</th>
                    <th className="px-4 py-3">Tax</th>
                    <th className="px-4 py-3">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {regimeComparison.map((row) => (
                    <tr key={row.regime} className="border-t border-gray-200">
                      <td className="px-4 py-3 font-bold text-gray-900">{row.regime}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMoney(row.taxableIncome)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMoney(row.tax)}</td>
                      <td className="px-4 py-3 text-gray-600">{row.decision}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-3xl font-bold text-gray-800">Scenario Comparison</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Scenario</th>
                    <th className="px-4 py-3">Tax</th>
                    <th className="px-4 py-3">Saving</th>
                    <th className="px-4 py-3">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioComparison.map((scenario) => (
                    <tr key={scenario.id} className="border-t border-gray-200">
                      <td className="px-4 py-3 font-bold text-gray-900">{scenario.label}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMoney(scenario.tax)}</td>
                      <td className="px-4 py-3 font-bold text-green-700">{formatMoney(scenario.savingVsCurrent)}</td>
                      <td className="px-4 py-3 text-gray-600">{scenario.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-gray-800">Filing Progress</h2>

          <div className="grid grid-cols-4 gap-4 border-t border-gray-200 pt-5">
            {filingProgress.map((step, index) => (
              <button
                key={step.title}
                onClick={() => router.push(step.route)}
                className="rounded-xl border border-gray-200 bg-slate-50 p-4 text-left transition hover:border-yellow-300 hover:bg-yellow-50"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-800 ring-1 ring-gray-200">
                    {index + 1}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-gray-200">
                    {step.status}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{step.detail}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-3xl font-bold text-gray-800">Document Intelligence</h2>
            <button
              onClick={() => router.push("/import-data")}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Import / Review
            </button>
          </div>

          <div className="space-y-4 border-t border-gray-200 pt-5">
            {documentRows.length > 0 ? (
              documentRows.map((row) => (
                <div key={row.source} className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[0.9fr_1.2fr_1.2fr]">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Source</p>
                      <p className="mt-1 font-bold text-gray-900">{row.source}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Mapped Sections</p>
                      <p className="mt-1 text-sm leading-6 text-gray-700">{row.mapped}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Extracted Totals</p>
                      <p className="mt-1 text-sm leading-6 text-gray-700">{row.extracted}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-gray-600">
                No source document has been imported yet. Upload AIS/Form 26AS to auto-map income, TDS, and review flags.
              </div>
            )}
            {extractionReview.length > 6 && (
              <button
                onClick={() => router.push("/import-data")}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                Review {extractionReview.length - 6} more extracted fields
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-3xl font-bold text-gray-800">Ways to Save</h2>

            <div className="space-y-4 border-t border-gray-200 pt-5">
              {savingCards.length > 0 ? (
                savingCards.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-xl border border-green-100 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-green-950">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-green-800">{item.detail}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100">
                        {formatMoney(item.impact)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-gray-600">
                  No major saving gap found yet. Add income, deductions, and tax statement data for better suggestions.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-3xl font-bold text-gray-800">Risk Breakdown</h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                Risk {intelligence.anomalies.score}/100
              </span>
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-5">
              {riskBreakdown.length > 0 ? (
                riskBreakdown.map((risk, index) => (
                  <div key={`${risk.title}-${index}`} className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-orange-950">{risk.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-orange-800">{risk.reason}</p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-orange-700">
                          Fix: {risk.action}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-100">
                        +{risk.points}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-gray-600">
                  No major issue found in the fields TaxBee tracks.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Next-Year Planning</h2>
              <p className="mt-1 text-sm text-gray-500">Estimate based on 10% income growth and common deduction scenarios.</p>
            </div>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-gray-900">
              Best: {formatMoney(intelligence.nextYear.bestTax)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t border-gray-200 pt-5">
            {planningScenarios.map((scenario) => (
              <div key={scenario.id} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                <h3 className="font-bold text-gray-900">{scenario.label}</h3>
                <p className="mt-3 text-2xl font-bold text-blue-700">{formatMoney(scenario.tax)}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{scenario.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-gray-800">Your Activity</h2>

          <div className="space-y-4 border-t border-gray-200 pt-5">
            {activities.map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-4 border-b border-gray-100 pb-4 text-xl text-gray-700 last:border-b-0"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg ${
                    item.status === "done"
                      ? "border-green-300 text-green-600"
                      : "border-gray-300 text-gray-500"
                  }`}
                >
                  {item.status === "done" ? "OK" : "..."}
                </span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-blue-900">Need Help?</h2>

          <div className="space-y-4 border-t border-gray-200 pt-5">
            <button className="block w-full border-b border-gray-100 pb-4 text-left text-2xl font-medium text-gray-700 hover:text-blue-600">
              Chat with Expert
            </button>

            <button className="block w-full text-left text-2xl font-medium text-gray-700 hover:text-blue-600">
              Request Call Back
            </button>
          </div>
        </div>
      </main>

      <BeeAssistantProvider />
    </div>
  );
}
