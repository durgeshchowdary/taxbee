"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TAXBEE_SITE_MAP, STORAGE_KEYS } from "@/backend/utils/siteMap";
import { tokenize, calculateScore } from "@/backend/utils/nlp";
import { GUIDES, HIGH_VALUE_TAX_TERMS } from "@/backend/utils/BeeAssistantConfig";
import { buildTaxIntelligence } from "@/backend/utils/taxEngine";

export type Message = {
  sender: "user" | "assistant";
  text: string;
  guideOfferId?: string;
  explainability?: Explainability;
};

type AssistantResponse = {
  reply?: string;
  memorySummary?: string;
  actions?: AssistantAction[];
  explainability?: Explainability;
  degraded?: boolean;
  retryable?: boolean;
  requestId?: string;
};

export type BeeAssistantProps = {
  section?: string;
  context?: Record<string, unknown>;
};

export type GuideStep = {
  id: string;
  label: string;
  route: string;
  instruction: string;
};

export type Guide = {
  id: string;
  title: string;
  doneMessage: string;
  intents: string[];
  intentGroups: string[][];
  steps: GuideStep[];
};

type AssistantAction =
  | {
      type: "navigate";
      route: string;
      label?: string;
    }
  | {
      type: "validation_summary";
      label?: string;
      issues?: string[];
    }
  | {
      type: "set_local_storage";
      key: string;
      path: string;
      value: string;
      label?: string;
      route?: string;
    }
  | {
      type: "create_reviewer_comment";
      fieldKey?: string;
      comment: string;
      label?: string;
    };

type ChecklistItem = {
  label: string;
  done: boolean;
};

type SmartSuggestion = {
  label: string;
  detail: string;
  kind: "guide" | "message" | "route";
  value: string;
};

type Explainability = {
  confidence?: number;
  basedOn?: string[];
  sourceFields?: string[];
  sourceDocuments?: string[];
  auditRefs?: string[];
  calculationBasis?: string[];
  warnings?: string[];
  missingData?: string[];
  dataStates?: {
    confirmed?: number;
    extracted?: number;
    overridden?: number;
  };
  mode?: string;
};

type AuditEntry = {
  id: string;
  timestamp: number | string;
  label?: string;
  eventType?: string;
  key: string;
  path?: string;
  fieldKey?: string;
  oldValue: unknown;
  newValue: unknown;
};
type ExtractionReviewRecord = {
  id: string;
  label: string;
  value: string;
  mappedSection: string;
  confidence: number;
  status: "extracted" | "confirmed" | "overridden";
};
type CopilotScenario = {
  label: string;
  tax: number;
  savingVsCurrent: number;
  detail: string;
};
type CopilotRisk = {
  title: string;
  points: number;
  reason: string;
  action: string;
};

const MAX_STORED_MESSAGES = 60;
const MAX_HISTORY_MESSAGES = 40;
const MAX_AUDIT_ENTRIES = 100;
const ASSISTANT_TIMEOUT_MS = 40_000;

const INITIAL_MESSAGES: Message[] = [
  {
    sender: "assistant",
    text: "Hi, I’m Bee Assistant. I can guide you through filing your ITR step by step.",
  },
];

const safeUserContext = (rawUser: string | null) => {
  if (!rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as {
      name?: string;
      email?: string;
      isVerified?: boolean;
    };

    return {
      name: user.name || null,
      emailDomain: user.email?.includes("@") ? user.email.split("@")[1] : null,
      isVerified: Boolean(user.isVerified),
    };
  } catch {
    return null;
  }
};

const hasAnyAmount = (record: unknown) =>
  Boolean(
    record &&
      typeof record === "object" &&
      Object.values(record as Record<string, unknown>).some((value) => Number(value || 0) > 0)
  );

const readAuditTrail = (): AuditEntry[] => {
  return [];
};

const findGuideForMessage = (message: string) => {
  const queryTokens = tokenize(message);
  if (queryTokens.length === 0) return null;

  const scoredGuides = GUIDES.map((guide) => {
    const targetKeywords = [...guide.intents, ...guide.intentGroups.flat()];
    let score = calculateScore(queryTokens, targetKeywords, HIGH_VALUE_TAX_TERMS);

    // Phrase-level match bonus
    if (
      guide.intents.some((intent) =>
        message.toLowerCase().includes(intent.toLowerCase())
      )
    ) {
      score += 5;
    }

    return { guide, score };
  });

  const sorted = scoredGuides.sort((a, b) => b.score - a.score);
  const best = sorted[0];

  return best && best.score >= 2.5 ? best.guide : null;
};

const shouldShowValidationSummary = (message = "") => {
  const normalized = message.toLowerCase();
  return [
    "review",
    "check",
    "validate",
    "validation",
    "missing",
    "incomplete",
    "risk",
    "error",
    "mistake",
    "issue",
    "problem",
    "status",
    "ready",
    "health",
    "final",
    "filing",
  ].some((term) => normalized.includes(term));
};

const isTaxHelpOverviewRequest = (message = "") => {
  const normalized = message.toLowerCase();
  return (
    /\b(help|guide|assist|support)\b/.test(normalized) &&
    /\b(tax|itr|return|filing)\b/.test(normalized)
  );
};

const notifyStateChange = (key: string, path: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("taxbee:storage-updated", { detail: { key, path } }));
    window.dispatchEvent(new CustomEvent("taxbee:highlight-field", { detail: { key, path } }));
  }
};

const getNestedValue = (source: Record<string, unknown>, path: string) =>
  path.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>)[part];
  }, source);

const setNestedValue = (
  source: Record<string, unknown>,
  path: string,
  value: string
) => {
  const pathParts = path.split(".");
  let target = source;

  pathParts.slice(0, -1).forEach((part) => {
    const next = target[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      target[part] = {};
    }
    target = target[part] as Record<string, unknown>;
  });

  target[pathParts[pathParts.length - 1]] = value;
};

const saveAssistantFieldToMongo = async (action: Extract<AssistantAction, { type: "set_local_storage" }>) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Sign in before Bee Assistant can update tax data.");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (action.key === STORAGE_KEYS.DEDUCTIONS) {
    const getRes = await fetch("/api/deductions", { headers });
    const getData = await getRes.json().catch(() => ({}));
    if (!getRes.ok) throw new Error(getData.message || "Could not load deductions.");

    const current =
      getData.data?.deductions && typeof getData.data.deductions === "object"
        ? { ...getData.data.deductions }
        : {};
    const oldValue = getNestedValue(current, action.path);
    setNestedValue(current, action.path, action.value);

    const putRes = await fetch("/api/deductions", {
      method: "PUT",
      headers,
      body: JSON.stringify({ deductions: current, sourceType: "assistant" }),
    });
    const putData = await putRes.json().catch(() => ({}));
    if (!putRes.ok) throw new Error(putData.message || "Could not save deductions.");
    return { oldValue };
  }

  if (action.key === STORAGE_KEYS.ITR_DRAFT) {
    const getRes = await fetch("/api/itr-draft", { headers });
    const getData = await getRes.json().catch(() => ({}));
    if (!getRes.ok) throw new Error(getData.message || "Could not load ITR draft.");

    const current =
      getData.data?.draft && typeof getData.data.draft === "object"
        ? { ...getData.data.draft }
        : {};
    const oldValue = getNestedValue(current, action.path);
    setNestedValue(current, action.path, action.value);

    const putRes = await fetch("/api/itr-draft", {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...current, sourceType: "assistant" }),
    });
    const putData = await putRes.json().catch(() => ({}));
    if (!putRes.ok) throw new Error(putData.message || "Could not save ITR draft.");
    return { oldValue };
  }

  throw new Error("Bee Assistant can only update MongoDB-backed tax fields.");
};

export default function BeeAssistant({
  section = "",
  context = {},
}: BeeAssistantProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [storedContext, setStoredContext] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [pendingActions, setPendingActions] = useState<AssistantAction[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [assistantStatus, setAssistantStatus] = useState<"ready" | "degraded">(
    "ready"
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const savedMemoryPreference = localStorage.getItem(STORAGE_KEYS.MEMORY_ENABLED);
      const nextMemoryEnabled = savedMemoryPreference !== "false";
      setMemoryEnabled(nextMemoryEnabled);

      const savedMessages = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (nextMemoryEnabled && savedMessages) {
        const parsedMessages = JSON.parse(savedMessages || "[]") as Message[];
        if (Array.isArray(parsedMessages)) {
          setMessages(parsedMessages.slice(-MAX_STORED_MESSAGES));
        }
      } else {
        // Personalized welcome for new chat sessions
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
        if (savedUser) {
          try {
            const user = JSON.parse(savedUser);
            if (user && user.name) {
              setMessages([{
                sender: "assistant",
                text: `Hi ${user.name}, I’m Bee Assistant. I can guide you through filing your ITR step by step.`
              }]);
            }
          } catch {
            // Silent fallback to default greeting if parsing fails
          }
        }
      }

      const savedWorkflow = localStorage.getItem(STORAGE_KEYS.WORKFLOW);
      if (savedWorkflow) {
        const parsed = JSON.parse(savedWorkflow) as {
          activeGuideId?: string;
          activeStepIndex?: number;
        };
        if (parsed.activeGuideId && typeof parsed.activeStepIndex === "number") {
          setActiveGuideId(parsed.activeGuideId);
          setActiveStepIndex(parsed.activeStepIndex);
        }
      }

      setAuditTrail(readAuditTrail());
    } catch {
      localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
    }
  }, []);

  useEffect(() => {
    try {
      if (!memoryEnabled) {
        localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
        return;
      }

      localStorage.setItem(
        STORAGE_KEYS.CHAT_HISTORY,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
      );
    } catch {
      // Chat memory is only a convenience; the assistant still works without it.
    }
  }, [messages, memoryEnabled]);

  useEffect(() => {
    if (activeStepIndex === null || activeGuideId === null) return;

    localStorage.setItem(
      STORAGE_KEYS.WORKFLOW,
      JSON.stringify({ activeGuideId, activeStepIndex })
    );
  }, [activeGuideId, activeStepIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const refreshContext = async () => {
      try {
        const localContext: Record<string, unknown> = {
          itrDraft: null,
          itrSummary: null,
          aisImport: null,
          extractionReview: [],
          deductions: null,
          taxpayerProfile: null,
          user: safeUserContext(localStorage.getItem(STORAGE_KEYS.USER)),
        };
        const token = localStorage.getItem("token");

        if (token) {
          try {
            const res = await fetch("/api/tax-context", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            const taxContext = data.data || data;
            if (res.ok && taxContext) {
              localContext.itrDraft = taxContext.draft || null;
              localContext.aisImport = taxContext.aisImport || null;
              localContext.extractionReview = taxContext.extractionReview || [];
              localContext.deductions = taxContext.deductions || null;
              localContext.taxpayerProfile = taxContext.taxpayerProfile || null;
              localContext.user = taxContext.user || localContext.user;
              localContext.imports = taxContext.imports || [];
              localContext.taxIntelligence = taxContext.intelligence || null;
              localContext.backendTaxIntelligence = taxContext.taxIntelligence || null;
              localContext.provenance = taxContext.provenance || {};
              setAuditTrail(
                ((taxContext.auditTimeline || []) as AuditEntry[])
                  .slice(0, MAX_AUDIT_ENTRIES)
              );
            }
          } catch {
            // Assistant will stay honest and avoid tax estimates without backend context.
          }
        }

        setStoredContext(localContext);
      } catch {
        setStoredContext({});
      }
    };

    void refreshContext();
    window.addEventListener("taxbee:storage-updated", refreshContext);
    return () => window.removeEventListener("taxbee:storage-updated", refreshContext);
  }, [isOpen, pathname]);

  // Proactive section-based help
  useEffect(() => {
    if (isOpen && section && section !== "global") {
      const sectionKey = `proactive_greeted_${section}`;
      const hasBeenGreeted = sessionStorage.getItem(sectionKey);

      if (!hasBeenGreeted) {
        const pageName = TAXBEE_SITE_MAP.find(p => p.route === pathname)?.title || section;
        addAssistantMessage(
          `I see you're on the ${pageName} page. I'm specialized in Indian taxes 🐝 Let me help you with the specific rules or calculations for this section!`
        );
        sessionStorage.setItem(sectionKey, "true");
      }
    }
  }, [isOpen, section, pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const openAssistant = () => setIsOpen(true);
    window.addEventListener("taxbee:open-assistant", openAssistant);
    return () => window.removeEventListener("taxbee:open-assistant", openAssistant);
  }, []);

  const assistantContext = useMemo(
    () => {
      const taxIntelligence = buildTaxIntelligence({
        currentDraft: storedContext.itrDraft,
        deductions: storedContext.deductions,
        aisImport: storedContext.aisImport,
      });
      const backendTaxIntelligence = storedContext.backendTaxIntelligence || storedContext.taxIntelligence;
      const draft = storedContext.itrDraft as
        | {
            salary?: Record<string, unknown>;
            houseProperty?: Record<string, unknown>;
            pgbp?: Record<string, unknown>;
            capitalGains?: Record<string, unknown>;
            otherSources?: Record<string, unknown>;
          }
        | null
        | undefined;
      const hasTaxData =
        Boolean(storedContext.aisImport) ||
        Boolean((storedContext.extractionReview as unknown[])?.length) ||
        hasAnyAmount(storedContext.deductions) ||
        hasAnyAmount(draft?.salary) ||
        hasAnyAmount(draft?.houseProperty) ||
        hasAnyAmount(draft?.pgbp) ||
        hasAnyAmount(draft?.capitalGains) ||
        hasAnyAmount(draft?.otherSources);

      return {
        ...storedContext,
        ...context,
        taxIntelligence: backendTaxIntelligence || taxIntelligence,
        legacyTaxIntelligence: taxIntelligence,
        hasTaxData,
        site: {
          currentPath: pathname,
          currentPage: TAXBEE_SITE_MAP.find((page) => page.route === pathname) || null,
          pages: TAXBEE_SITE_MAP,
        },
        filingWorkflow:
          activeStepIndex === null || activeGuideId === null
            ? null
            : {
                activeGuideId,
                activeGuide: GUIDES.find((guide) => guide.id === activeGuideId),
                activeStepIndex,
                activeStep: GUIDES.find((guide) => guide.id === activeGuideId)
                  ?.steps[activeStepIndex],
                currentPath: pathname,
              },
      };
    },
    [storedContext, context, activeGuideId, activeStepIndex, pathname]
  );

  const checklist = useMemo<ChecklistItem[]>(() => {
    const draft = storedContext.itrDraft as
      | {
          salary?: Record<string, string>;
          houseProperty?: Record<string, string>;
          pgbp?: Record<string, string>;
          capitalGains?: Record<string, string>;
          otherSources?: Record<string, string>;
        }
      | null
      | undefined;
    const salary = draft?.salary || {};
    const deductions = storedContext.deductions as
      | Record<string, string>
      | null
      | undefined;

    const hasSalary = Boolean(
      salary.salary17_1 ||
        salary.perquisites17_2 ||
        salary.profits17_3 ||
        salary.exemptions10 ||
        salary.deductions16
    );
    const hasDeductions = Boolean(
      deductions?.section80C ||
        deductions?.healthInsurance ||
        deductions?.homeLoanInterest
    );
    const hasOtherHeads = Boolean(
      hasAnyAmount(draft?.houseProperty) ||
        hasAnyAmount(draft?.pgbp) ||
        hasAnyAmount(draft?.capitalGains) ||
        hasAnyAmount(draft?.otherSources)
    );

    return [
      {
        label: "PAN/user verified",
        done: Boolean(storedContext.taxpayerProfile || storedContext.verifiedPan || storedContext.user),
      },
      { label: "AIS imported", done: Boolean(storedContext.aisImport) },
      { label: "AIS review done", done: messages.some((msg) => msg.text.toLowerCase().includes("ais review")) },
      { label: "Income draft started", done: hasSalary || hasOtherHeads },
      { label: "All income heads reviewed", done: messages.some((msg) => msg.text.toLowerCase().includes("income heads")) },
      { label: "Missing documents checked", done: messages.some((msg) => msg.text.toLowerCase().includes("documents")) },
      { label: "Deductions checked", done: hasDeductions },
      { label: "Regime compared", done: messages.some((msg) => msg.text.toLowerCase().includes("regime")) },
      { label: "Final review done", done: messages.some((msg) => msg.text.toLowerCase().includes("review")) },
    ];
  }, [storedContext, messages]);

  const readinessScore = useMemo(() => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter((item) => item.done).length;
    return Math.round((completed / checklist.length) * 100);
  }, [checklist]);

  const copilotSnapshot = useMemo(() => {
    const taxIntelligence = (
      (assistantContext.legacyTaxIntelligence as ReturnType<typeof buildTaxIntelligence> | undefined) ||
      ((assistantContext.taxIntelligence as { legacy?: ReturnType<typeof buildTaxIntelligence> } | undefined)?.legacy) ||
      assistantContext.taxIntelligence
    ) as ReturnType<typeof buildTaxIntelligence>;
    const extractionReview = (storedContext.extractionReview || []) as ExtractionReviewRecord[];
    const unconfirmedFields = extractionReview.filter((record) => record.status === "extracted");
    const overriddenFields = extractionReview.filter((record) => record.status === "overridden");
    const topRisk = taxIntelligence.anomalies.flags[0];
    const bestSaving = taxIntelligence.recommendations.find((item) => Number(item?.impact || 0) > 0);
    const scenarioRows = taxIntelligence.explanation.scenarioComparison as CopilotScenario[];
    const riskRows = taxIntelligence.explanation.riskBreakdown as CopilotRisk[];
    const bestScenario = scenarioRows
      .filter((scenario) => scenario.savingVsCurrent > 0)
      .sort((a, b) => b.savingVsCurrent - a.savingVsCurrent)[0];
    const missingDocs: string[] = [];

    if (!storedContext.aisImport) missingDocs.push("AIS/Form 26AS");
    if (taxIntelligence.analysis.income.grossSalary > 0 && unconfirmedFields.length > 0) {
      missingDocs.push("confirmed extraction review");
    }
    if (taxIntelligence.analysis.income.grossSalary > 0 && !storedContext.aisImport) {
      missingDocs.push("Form 16/TDS proof");
    }

    return {
      taxIntelligence,
      extractionReview,
      unconfirmedFields,
      overriddenFields,
      topRisk,
      bestSaving,
      bestScenario,
      scenarioRows,
      riskRows,
      missingDocs,
    };
  }, [assistantContext, storedContext]);

  const getGroundedCopilotReply = (message: string) => {
    const normalized = message.toLowerCase();
    const {
      taxIntelligence,
      unconfirmedFields,
      overriddenFields,
      topRisk,
      bestSaving,
      bestScenario,
      scenarioRows,
      riskRows,
      missingDocs,
    } = copilotSnapshot;
    const hasTaxData = Boolean(assistantContext.hasTaxData);
    const bestTax = Math.min(
      taxIntelligence.analysis.tax.oldRegimeEstimatedTax,
      taxIntelligence.analysis.tax.newRegimeEstimatedTax
    );
    const regime =
      taxIntelligence.analysis.tax.betterRegime === "same"
        ? "either regime"
        : `${taxIntelligence.analysis.tax.betterRegime} regime`;

    if (!hasTaxData && /\b(tax|refund|due|risk|score|regime|saving|deduction|80c|80d|income|itr|file|filing)\b/.test(normalized)) {
      return "I do not have real tax data for you yet, so I will not estimate tax, refunds, risk, savings, or regime choice. Import AIS/Form 26AS, upload readable Form 16 data, or save income and deduction values first.";
    }

    if (/\b(what should i do|next|best action|do next|priority)\b/.test(normalized)) {
      const action = unconfirmedFields.length
        ? `confirm ${unconfirmedFields.length} extracted field${unconfirmedFields.length === 1 ? "" : "s"} on Import Data`
        : bestSaving
          ? bestSaving.title
          : topRisk
            ? topRisk.action
            : "review the final regime comparison";
      const impact = bestScenario
        ? `Estimated tax saving: Rs. ${Math.round(bestScenario.savingVsCurrent).toLocaleString("en-IN")}.`
        : bestSaving
          ? `Estimated tax saving: Rs. ${Math.round(bestSaving.impact).toLocaleString("en-IN")}.`
          : "No large tax-saving gap is visible yet.";
      const riskLine = topRisk
        ? `Main risk: ${topRisk.title} (+${topRisk.points} risk points).`
        : "No major risk flag is active right now.";

      return `Best action right now: ${action}.\n${impact}\n${riskLine}\n${unconfirmedFields.length ? "TaxBee should not fully trust extracted values until you confirm or override them." : `Current best tax estimate is Rs. ${Math.round(bestTax).toLocaleString("en-IN")} under the ${regime}.`}`;
    }

    if (/\b(risk|score|why.*high|filing risk)\b/.test(normalized)) {
      const risks = riskRows.slice(0, 3);
      if (!risks.length) {
        return "Your current risk score is low because TaxBee has not found major mismatches in the tracked fields. Still verify AIS/Form 26AS, Form 16, and deduction proofs before filing.";
      }

      return [
        `Your risk score is ${taxIntelligence.anomalies.score}/100 because of these checks:`,
        ...risks.map((risk) => `+${risk.points}: ${risk.title} - ${risk.reason} Fix: ${risk.action}`),
      ].join("\n");
    }

    if (/\b(regime|old|new|why.*choose|chosen)\b/.test(normalized)) {
      const rows = taxIntelligence.explanation.regimeComparison;
      return [
        `TaxBee currently prefers ${regime} because it gives the lowest estimate based on entered data.`,
        ...rows.map(
          (row) =>
            `${row.regime}: taxable income Rs. ${Math.round(row.taxableIncome).toLocaleString("en-IN")}, tax Rs. ${Math.round(row.tax).toLocaleString("en-IN")} (${row.decision}).`
        ),
        `Difference: Rs. ${Math.round(taxIntelligence.analysis.tax.estimatedSavings).toLocaleString("en-IN")}.`,
      ].join("\n");
    }

    if (/\b(extract|extracted|confidence|confirm|override|source|document)\b/.test(normalized)) {
      const extractionLine = unconfirmedFields.length
        ? `${unconfirmedFields.length} extracted field${unconfirmedFields.length === 1 ? " is" : "s are"} still unconfirmed.`
        : "All currently tracked extracted fields are confirmed or overridden.";
      const overrideLine = overriddenFields.length
        ? `${overriddenFields.length} field${overriddenFields.length === 1 ? " was" : "s were"} manually overridden, so user-corrected values are now canonical.`
        : "No overridden extracted fields yet.";
      const docLine = missingDocs.length
        ? `Still useful to add/review: ${missingDocs.join(", ")}.`
        : "No major missing document signal is visible from current data.";

      return `${extractionLine}\n${overrideLine}\n${docLine}`;
    }

    if (/\b(audit|history|changed|override trail|who changed)\b/.test(normalized)) {
      const recent = auditTrail.slice(0, 5);
      if (!recent.length) {
        return "No audit entries are stored yet. Once parser extractions are created or you confirm/override values, TaxBee records the field, old value, new value, source, and timestamp.";
      }

      return [
        "Recent audit trail:",
        ...recent.map((entry) => {
          const source = "source" in entry ? String((entry as AuditEntry & { source?: string }).source || "TaxBee") : "TaxBee";
          return `${entry.label}: ${entry.path} changed from ${String(entry.oldValue || "blank")} to ${entry.newValue} (${source}).`;
        }),
      ].join("\n");
    }

    if (/\b(save|saving|deduction|80c|80d|reduce tax)\b/.test(normalized)) {
      const scenarios = scenarioRows
        .filter((scenario) => scenario.savingVsCurrent > 0)
        .slice(0, 3);
      if (!scenarios.length) {
        return "TaxBee does not see a major deduction-driven saving gap yet. Add or review 80C, 80D, home-loan interest, and salary details so I can estimate impact.";
      }

      return [
        "Here are the best visible saving simulations from your current data:",
        ...scenarios.map(
          (scenario) =>
            `${scenario.label}: tax Rs. ${Math.round(scenario.tax).toLocaleString("en-IN")}, saving Rs. ${Math.round(scenario.savingVsCurrent).toLocaleString("en-IN")}. ${scenario.detail}`
        ),
      ].join("\n");
    }

    return null;
  };

  const smartSuggestions = useMemo<SmartSuggestion[]>(() => {
    const isDone = (label: string) =>
      checklist.some((item) => item.label === label && item.done);
    const suggestions: SmartSuggestion[] = [];
    const draft = storedContext.itrDraft as
      | {
          salary?: Record<string, string>;
          houseProperty?: Record<string, string>;
          pgbp?: Record<string, string>;
          capitalGains?: Record<string, string>;
          otherSources?: Record<string, string>;
        }
      | null
      | undefined;
    const aisImport = storedContext.aisImport as
      | { detectedSections?: string[]; totals?: Record<string, number> }
      | null
      | undefined;

    if (!isDone("PAN/user verified")) {
      suggestions.push({
        label: "Verify taxpayer",
        detail: "Start with identity details before filing.",
        kind: "route",
        value: "/import-data",
      });
    }

    if (aisImport && !isDone("AIS review done")) {
      suggestions.push({
        label: "Review AIS import",
        detail: "Explain mapped heads, warnings, and what to verify.",
        kind: "message",
        value: "Run an AIS review. Explain mapped income heads, possible filing warnings, and what I should verify.",
      });
    }

    if ((hasAnyAmount(draft?.capitalGains) || hasAnyAmount(draft?.pgbp) || hasAnyAmount(draft?.houseProperty)) && !isDone("Missing documents checked")) {
      suggestions.push({
        label: "Check documents",
        detail: "List documents needed for imported income heads.",
        kind: "message",
        value: "Check missing documents based on my imported AIS and ITR draft income heads.",
      });
    }

    if (!isDone("Income draft started")) {
      suggestions.push({
        label: "Enter income",
        detail: "Review imported heads or add missing income data.",
        kind: "route",
        value: "/file-your-itr",
      });
    }

    if (isDone("AIS imported") && !isDone("All income heads reviewed")) {
      suggestions.push({
        label: "Review heads",
        detail: "Open Start New Filing and verify mapped income heads.",
        kind: "route",
        value: "/file-your-itr",
      });
    }

    if (!isDone("Deductions checked")) {
      suggestions.push({
        label: "Check deductions",
        detail: "Review 80C, 80D, and home loan entries.",
        kind: "route",
        value: "/deductions",
      });
    }

    if (!isDone("Regime compared")) {
      suggestions.push({
        label: "Compare regimes",
        detail: "Estimate old vs new regime using imported heads and deductions.",
        kind: "message",
        value: "Compare old and new tax regimes using my saved draft.",
      });
    }

    if (readinessScore >= 60 && !isDone("Final review done")) {
      suggestions.push({
        label: "Find filing risks",
        detail: "Detect AIS income, TDS, and missing-field mismatches.",
        kind: "message",
        value: "Run a filing error detector on my AIS import and ITR draft. Tell me missing fields and risky entries.",
      });
    }

    if (pathname === "/file-your-itr") {
      suggestions.unshift({
        label: "Help on this page",
        detail: "Explain which salary field to fill next.",
        kind: "message",
        value: "Guide me on this ITR salary page using my current draft.",
      });
    }

    if (pathname === "/deductions") {
      suggestions.unshift({
        label: "Find savings",
        detail: "Suggest deductions I may have missed.",
        kind: "message",
        value: "Check my deductions and suggest what I may be missing.",
      });
    }

    return suggestions.slice(0, 3);
  }, [checklist, pathname, readinessScore, storedContext.aisImport, storedContext.itrDraft]);

  const addAssistantMessage = (text: string, guideOfferId?: string, explainability?: Explainability) => {
    const assistantMessage: Message = { sender: "assistant", text, guideOfferId, explainability };
    setMessages((prev) =>
      [...prev, assistantMessage].slice(-MAX_STORED_MESSAGES)
    );
    // Sync with backend if logged in
    // saveToBackend(assistantMessage);
  };

  const applyAction = async (action: AssistantAction) => {
    if (action.type === "set_local_storage") {
      try {
        const { oldValue } = await saveAssistantFieldToMongo(action);
        const auditEntry: AuditEntry = {
          id: `${Date.now()}-${action.key}-${action.path}`,
          timestamp: Date.now(),
          label: action.label || "Updated draft field",
          key: action.key,
          path: action.path,
          oldValue,
          newValue: action.value,
        };
        const nextAuditTrail = [auditEntry, ...auditTrail].slice(0, MAX_AUDIT_ENTRIES);
        localStorage.setItem(
          STORAGE_KEYS.HIGHLIGHT,
          JSON.stringify({
            route: action.route,
            key: action.key,
            path: action.path,
            timestamp: Date.now(),
          })
        );
        setAuditTrail(nextAuditTrail);

        // Recommendation: Use a custom hook or Context Provider to manage this 
        // instead of raw Window events.
        notifyStateChange(action.key, action.path);

        addAssistantMessage(`${action.label || "Updated the draft"} and saved it to MongoDB.`);

        if (action.route && action.route !== pathname) {
          router.push(action.route);
        }
      } catch {
        addAssistantMessage("I could not update that field automatically. No browser-only tax data was saved.");
      }
    }

    if (action.type === "navigate" && action.route !== pathname) {
      addAssistantMessage(`${action.label || "Opening page"}...`);
      router.push(action.route);
    }

    if (action.type === "validation_summary" && action.issues?.length) {
      addAssistantMessage(
        `I found these items to review:\n${action.issues.join("\n")}`
      );
    }

    if (action.type === "create_reviewer_comment") {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Missing token");
        const res = await fetch("/api/collaboration/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fieldKey: action.fieldKey || "",
            comment: action.comment,
            entityType: action.fieldKey ? "tax_field" : "workspace",
          }),
        });
        const data = await res.json().catch(() => ({}));
        addAssistantMessage(data.message || (res.ok ? "Reviewer comment saved to MongoDB." : "Could not save reviewer comment."));
      } catch {
        addAssistantMessage("I could not create that reviewer comment. No local-only comment was saved.");
      }
    }
  };

  const executeActions = (actions: AssistantAction[] = [], sourceMessage = "") => {
    const safeActions = actions.filter(
      (action) =>
        action.type !== "validation_summary" ||
        shouldShowValidationSummary(sourceMessage)
    );
    const actionsNeedingConfirmation = safeActions.filter(
      (action) => action.type === "set_local_storage" || action.type === "create_reviewer_comment"
    );
    const immediateActions = safeActions.filter(
      (action) => action.type !== "set_local_storage"
    );

    immediateActions.forEach((action) => void applyAction(action));

    if (actionsNeedingConfirmation.length > 0) {
      setPendingActions(actionsNeedingConfirmation);
      addAssistantMessage("I can update that field for you. Review and apply it below.");
    }
  };

  const applyPendingActions = () => {
    pendingActions.forEach((action) => void applyAction(action));
    setPendingActions([]);
  };

  const cancelPendingActions = () => {
    setPendingActions([]);
    addAssistantMessage("Okay, I did not change your draft.");
  };

  const runSmartSuggestion = (suggestion: SmartSuggestion) => {
    if (suggestion.kind === "route") {
      setIsOpen(true);
      router.push(suggestion.value);
      addAssistantMessage(`${suggestion.label}: opening the right page now.`);
      return;
    }

    if (suggestion.kind === "guide") {
      const guide = GUIDES.find((item) => item.id === suggestion.value);
      if (guide) startGuide(guide, 0);
      return;
    }

    void sendMessage(suggestion.value);
  };

  const toggleMemory = () => {
    const nextMemoryEnabled = !memoryEnabled;
    setMemoryEnabled(nextMemoryEnabled);
    localStorage.setItem(STORAGE_KEYS.MEMORY_ENABLED, String(nextMemoryEnabled));

    if (!nextMemoryEnabled) {
      localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.MEMORY);
      addAssistantMessage("Memory is off. I will use only this live chat context.");
    } else {
      addAssistantMessage("Memory is on. I can use earlier TaxBee chat context again.");
    }
  };

  const getActiveGuide = () =>
    GUIDES.find((guide) => guide.id === activeGuideId) ?? null;

  const startGuide = (guide: Guide, stepIndex = 0) => {
    setActiveGuideId(guide.id);
    navigateToStep(guide, stepIndex);
  };

  const navigateToStep = (guide: Guide, stepIndex: number) => {
    const step = guide.steps[stepIndex];
    if (!step) return;

    setActiveGuideId(guide.id);
    setActiveStepIndex(stepIndex);
    setIsOpen(true);
    addAssistantMessage(
      `${step.instruction}\n\n${guide.title}: step ${stepIndex + 1} of ${guide.steps.length} - ${step.label}.`
    );
    router.push(step.route);
  };

  const completeWorkflow = () => {
    const guide = getActiveGuide();
    setActiveStepIndex(null);
    setActiveGuideId(null);
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
    addAssistantMessage(guide?.doneMessage || "Guide complete.");
  };

  const handleWorkflowCommand = (userMessage: string) => {
    const normalized = userMessage.toLowerCase();

    if (isTaxHelpOverviewRequest(userMessage)) {
      addAssistantMessage(
        [
          "Here is the simple TaxBee filing path:",
          "",
          "1. Verify taxpayer details and PAN.",
          "2. Import AIS/Form 26AS or enter Form 16 details.",
          "3. Review salary and other income heads.",
          "4. Add eligible deductions like 80C, 80D, and home loan interest.",
          "5. Compare old vs new regime.",
          "6. Do a final review before filing.",
          "",
          "Use the Guide me option below and I will take you through these pages one by one.",
        ].join("\n"),
        "file-itr"
      );
      return true;
    }

    const requestedGuide = findGuideForMessage(userMessage);
    if (requestedGuide) {
      startGuide(requestedGuide, 0);
      return true;
    }

    const activeGuide = getActiveGuide();
    if (activeStepIndex === null || !activeGuide) return false;

    if (
      normalized.includes("next") ||
      normalized.includes("done") ||
      normalized.includes("completed") ||
      normalized.includes("continue")
    ) {
      const nextIndex = activeStepIndex + 1;
      if (nextIndex >= activeGuide.steps.length) {
        completeWorkflow();
      } else {
        navigateToStep(activeGuide, nextIndex);
      }
      return true;
    }

    if (normalized.includes("back") || normalized.includes("previous")) {
      navigateToStep(activeGuide, Math.max(activeStepIndex - 1, 0));
      return true;
    }

    if (normalized.includes("stop guide") || normalized.includes("cancel guide")) {
      setActiveStepIndex(null);
      setActiveGuideId(null);
      localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
      addAssistantMessage("Okay, I stopped the guided filing flow.");
      return true;
    }

    return false;
  };

  const sendMessage = async (messageOverride?: string) => {
    const userMessage = (messageOverride ?? input).trim();
    if (!userMessage || loading) return;

    const outgoingMessage: Message = { sender: "user", text: userMessage };
    const nextMessages: Message[] = [
      ...messages,
      outgoingMessage,
    ].slice(-MAX_STORED_MESSAGES);

    setMessages(nextMessages);
    setInput("");
    setLastFailedMessage(null);

    if (handleWorkflowCommand(userMessage)) return;

    const groundedReply = /\b(guide|open|go to|take me|next page)\b/i.test(userMessage)
      ? getGroundedCopilotReply(userMessage)
      : null;
    if (groundedReply) {
      addAssistantMessage(groundedReply);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/ai/bee-assistant", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          section,
          context: assistantContext,
          history: memoryEnabled
            ? nextMessages.slice(-MAX_HISTORY_MESSAGES)
            : [outgoingMessage],
          memorySummary: memoryEnabled
            ? localStorage.getItem(STORAGE_KEYS.MEMORY) || ""
            : "",
        }),
      });

      const text = await res.text();
      let data: AssistantResponse = {};
      try {
        data = text ? (JSON.parse(text) as AssistantResponse) : {};
      } catch {
        data = {
          reply: text || "Bee Assistant returned an unreadable response.",
          degraded: true,
          retryable: true,
        };
      }

      setAssistantStatus(data.degraded || !res.ok ? "degraded" : "ready");
      if (!res.ok || data.retryable) {
        setLastFailedMessage(userMessage);
      }

      if (memoryEnabled && typeof data.memorySummary === "string") {
        localStorage.setItem(STORAGE_KEYS.MEMORY, data.memorySummary);
      }

      addAssistantMessage(
        data.reply ||
          (res.ok
            ? "Sorry, I couldn’t understand that."
            : "Bee Assistant request failed."),
        undefined,
        data.explainability
      );
      if (Array.isArray(data.actions)) {
        executeActions(data.actions, userMessage);
      }
    } catch (error) {
      console.error("Bee Assistant error:", error);
      setAssistantStatus("degraded");
      setLastFailedMessage(userMessage);
      addAssistantMessage(
        error instanceof Error && error.name === "AbortError"
          ? "Bee Assistant took too long to respond. Your message is saved here, so you can retry."
          : "Bee Assistant is temporarily unavailable. Your draft is safe, and you can retry."
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const renderMessageText = (text: string) =>
    text.split("\n").map((line, index) => (
      <span key={`${line}-${index}`}>
        {line}
        {index < text.split("\n").length - 1 && <br />}
      </span>
    ));

  const renderExplainability = (explainability?: Explainability) => {
    if (!explainability) return null;
    const basedOn = explainability.basedOn || [];
    const warnings = explainability.warnings || [];
    const missingData = explainability.missingData || [];
    const sourceFields = explainability.sourceFields || [];
    const sourceDocuments = explainability.sourceDocuments || [];
    const auditRefs = explainability.auditRefs || [];
    const basis = explainability.calculationBasis || [];
    const states = explainability.dataStates;

    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-5 text-slate-300">
        <div className="flex flex-wrap gap-2">
          {typeof explainability.confidence === "number" && (
            <span className="rounded border border-yellow-400/30 px-2 py-0.5 text-yellow-200">
              Confidence {explainability.confidence}/100
            </span>
          )}
          {states && (
            <span className="rounded border border-slate-600 px-2 py-0.5">
              {states.confirmed || 0} confirmed · {states.extracted || 0} extracted · {states.overridden || 0} overridden
            </span>
          )}
        </div>
        {basedOn.length > 0 && <div className="mt-2">Based on: {basedOn.slice(0, 4).join(", ")}</div>}
        {sourceFields.length > 0 && <div>Fields: {sourceFields.slice(0, 4).join(", ")}</div>}
        {sourceDocuments.length > 0 && <div>Sources: {sourceDocuments.slice(0, 3).join(", ")}</div>}
        {basis.length > 0 && <div>Basis: {basis.slice(0, 2).join(" ")}</div>}
        {missingData.length > 0 && <div className="text-amber-200">Missing: {missingData.slice(0, 4).join(", ")}</div>}
        {warnings.length > 0 && <div className="text-red-200">Warnings: {warnings.slice(0, 3).join(" ")}</div>}
        {auditRefs.length > 0 && <div>Audit refs: {auditRefs.slice(0, 3).join(", ")}</div>}
      </div>
    );
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    setActiveGuideId(null);
    setActiveStepIndex(null);
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.MEMORY);
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
  };

  const quickPrompts = [
    {
      label: "AIS Review",
      text: "Run an AIS review and explain what was mapped into each income head.",
    },
    {
      label: "Filing Risks",
      text: "Run a filing error detector on my AIS import and ITR draft.",
    },
    {
      label: "Regime Advice",
      text: "Compare old and new tax regimes using my saved draft and deductions.",
    },
    {
      label: "Start Filing",
      text: "Help me file my ITR step by step.",
    },
    {
      label: "Deductions",
      text: "Guide me to claim deductions.",
    },
    {
      label: "Documents",
      text: "Guide me to upload documents.",
    },
    {
      label: "Tax Savings",
      text: "Show me tax savings options.",
    },
  ];

  const startableGuides = GUIDES.filter((guide) =>
    ["file-itr", "deductions", "documents", "tax-savings", "dashboard", "help"].includes(
      guide.id
    )
  );

  const activeGuide = getActiveGuide();
  const activeStep =
    activeStepIndex === null || !activeGuide
      ? null
      : activeGuide.steps[activeStepIndex];
  const dismissGuideOffer = (messageIndex: number) => {
    setMessages((prev) =>
      prev.map((message, index) =>
        index === messageIndex ? { ...message, guideOfferId: undefined } : message
      )
    );
  };

  const renderGuideOffer = (guide: Guide, messageIndex: number) => (
    <div className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3">
      <div className="text-xs font-semibold text-yellow-300">
        Guided help available
      </div>
      <div className="mt-1 font-bold text-white">{guide.title}</div>
      <p className="mt-1 text-xs leading-5 text-gray-300">
        I can open each page and explain what to do there.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => startGuide(guide, 0)}
          className="rounded bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black"
        >
          Guide me
        </button>
        <button
          type="button"
          onClick={() => dismissGuideOffer(messageIndex)}
          className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-200"
        >
          Not now
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-yellow-400 px-6 py-4 font-bold text-black shadow-2xl hover:scale-110 hover:bg-yellow-300 transition-all duration-300 active:scale-95 flex items-center gap-2"
      >
        <span className="text-xl">🐝</span>
        <span>Bee Assistant</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[620px] w-[400px] flex-col rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl ring-1 ring-white/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4 text-black shadow-md">
            <div>
              <span className="font-extrabold text-lg tracking-tight">Bee Assistant</span>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                {assistantStatus === "ready" ? "Ready" : "Degraded mode"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMemory}
                className="text-xs font-semibold hover:underline"
                title="Turn saved assistant memory on or off"
              >
                Memory {memoryEnabled ? "On" : "Off"}
              </button>
              <button
                type="button"
                onClick={clearChat}
                className="text-xs font-semibold hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {activeStep && (
            <div className="border-b border-white/5 bg-black/40 px-5 py-4 text-xs">
              <div className="mb-2 flex items-center justify-between text-yellow-300">
                <span className="font-bold uppercase tracking-tighter opacity-70">
                  {activeGuide?.title}: Step {activeStepIndex! + 1} of{" "}
                  {activeGuide?.steps.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStepIndex(null);
                    setActiveGuideId(null);
                    localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
                  }}
                  className="text-gray-300 hover:text-white"
                >
                  Stop
                </button>
              </div>
              <div className="font-bold text-sm text-white">{activeStep.label}</div>
              <div className="mt-1 text-gray-400">{activeStep.instruction}</div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    activeGuide &&
                    navigateToStep(activeGuide, Math.max(activeStepIndex! - 1, 0))
                  }
                  className="rounded border border-gray-700 px-2 py-1 text-gray-200 disabled:opacity-40"
                  disabled={activeStepIndex === 0}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex = activeStepIndex! + 1;
                    if (!activeGuide || nextIndex >= activeGuide.steps.length) {
                      completeWorkflow();
                    } else {
                      navigateToStep(activeGuide, nextIndex);
                    }
                  }}
                  className="rounded bg-yellow-400 px-2 py-1 font-semibold text-black"
                >
                  {activeGuide && activeStepIndex === activeGuide.steps.length - 1
                    ? "Finish"
                    : "Next"}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10">
            {!activeStep && (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="mb-2 text-xs font-semibold text-yellow-300">
                  What do you want to do?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {startableGuides.map((guide) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => startGuide(guide, 0)}
                      className="rounded-lg border border-gray-700 px-2 py-2 text-left text-xs text-gray-100 hover:border-yellow-400 hover:text-yellow-300"
                    >
                      {guide.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-yellow-400/80">
                <span>Filing checklist</span>
                <span>{readinessScore}% ready</span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
              <div className="space-y-1">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-xs text-gray-300"
                  >
                    <span className={item.done ? "text-green-400" : "text-gray-600"}>
                      {item.done ? "[x]" : "[ ]"}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {smartSuggestions.length > 0 && (
              <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-4">
                <div className="mb-2 text-xs font-semibold text-yellow-300">
                  Next best actions
                </div>
                <div className="space-y-2">
                  {smartSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.kind}-${suggestion.value}-${suggestion.label}-${index}`}
                      type="button"
                      onClick={() => runSmartSuggestion(suggestion)}
                      disabled={loading}
                      className="w-full rounded-lg border border-gray-700 px-3 py-2 text-left text-xs text-gray-100 transition hover:border-yellow-400 hover:bg-black disabled:opacity-60"
                    >
                      <span className="block font-semibold text-white">
                        {suggestion.label}
                      </span>
                      <span className="mt-1 block text-gray-400">
                        {suggestion.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {auditTrail.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recent assistant changes
                </div>
                <div className="space-y-2">
                  {auditTrail.slice(0, 2).map((entry) => (
                    <div key={entry.id} className="text-xs text-gray-300">
                      <div className="font-semibold text-gray-100">{entry.label || entry.eventType || "Audit event"}</div>
                      <div className="text-gray-500">
                        {entry.path || entry.fieldKey || "document"}: {String(entry.oldValue ?? "empty")} {"->"}{" "}
                        {String(entry.newValue ?? "empty")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingActions.length > 0 && (
              <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4 shadow-xl">
                <div className="mb-2 text-xs font-semibold text-yellow-300">
                  Confirm update
                </div>
                <div className="space-y-1 text-xs text-gray-100">
                  {pendingActions.map((action, index) => (
                    <div key={`${action.type}-${index}`}>
                      {action.type === "set_local_storage"
                        ? action.label || "Update draft field"
                        : action.label || "Assistant action"}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={applyPendingActions}
                    className="rounded bg-yellow-400 px-3 py-1 text-xs font-semibold text-black"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={cancelPendingActions}
                    className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {lastFailedMessage && (
              <div className="rounded-xl border border-red-400/40 bg-red-950/40 p-3">
                <div className="text-xs font-semibold text-red-200">
                  Last request did not complete
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-red-100">
                  {lastFailedMessage}
                </div>
                <button
                  type="button"
                  onClick={() => void sendMessage(lastFailedMessage)}
                  disabled={loading}
                  className="mt-3 rounded bg-red-200 px-3 py-1 text-xs font-semibold text-red-950 disabled:opacity-60"
                >
                  Retry
                </button>
              </div>
            )}

            {messages.map((msg, index) => {
              const messageGuide = msg.guideOfferId
                ? GUIDES.find((guide) => guide.id === msg.guideOfferId) ?? null
                : null;

              return (
                <div
                  key={`${msg.sender}-${index}`}
                  className={`max-w-[85%] px-4 py-3 text-sm shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                    msg.sender === "user"
                      ? "ml-auto bg-yellow-400 text-black rounded-2xl rounded-tr-none font-medium"
                      : "bg-white/10 text-slate-100 rounded-2xl rounded-tl-none border border-white/5"
                  }`}
                >
                  {renderMessageText(msg.text)}
                  {msg.sender === "assistant" ? renderExplainability(msg.explainability) : null}
                  {messageGuide ? renderGuideOffer(messageGuide, index) : null}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-1 items-center px-4 py-3 bg-white/5 rounded-2xl rounded-tl-none w-fit">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-gray-800 px-3 py-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => void sendMessage(prompt.text)}
                disabled={loading}
                className="shrink-0 rounded-full border border-yellow-400/50 px-3 py-1 text-xs text-yellow-300 hover:bg-yellow-400 hover:text-black disabled:opacity-60"
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-gray-700 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about tax..."
              className="min-w-0 flex-1 rounded-lg bg-gray-900 px-3 py-2 text-white outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
