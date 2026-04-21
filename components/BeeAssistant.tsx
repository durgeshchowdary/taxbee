"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TAXBEE_SITE_MAP, STORAGE_KEYS } from "@/backend/utils/siteMap";
import { tokenize, calculateScore } from "@/backend/utils/nlp";
import { GUIDES, HIGH_VALUE_TAX_TERMS } from "@/backend/utils/BeeAssistantConfig";

export type Message = {
  sender: "user" | "assistant";
  text: string;
};

type AssistantResponse = {
  reply?: string;
  memorySummary?: string;
  actions?: AssistantAction[];
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

type AuditEntry = {
  id: string;
  timestamp: number;
  label: string;
  key: string;
  path: string;
  oldValue: unknown;
  newValue: string;
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

const readAuditTrail = (): AuditEntry[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_TRAIL);
    return saved ? (JSON.parse(saved) as AuditEntry[]) : [];
  } catch {
    localStorage.removeItem(STORAGE_KEYS.AUDIT_TRAIL);
    return [];
  }
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
          } catch (e) {
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

    const refreshContext = () => {
      try {
        setStoredContext({
          itrDraft: JSON.parse(localStorage.getItem(STORAGE_KEYS.ITR_DRAFT) || "null"),
          itrSummary: JSON.parse(localStorage.getItem(STORAGE_KEYS.ITR_SUMMARY) || "null"),
          deductions: JSON.parse(localStorage.getItem(STORAGE_KEYS.DEDUCTIONS) || "null"),
          verifiedPan: localStorage.getItem(STORAGE_KEYS.VERIFIED_PAN),
          user: JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "null"),
        });
        setAuditTrail(readAuditTrail());
      } catch {
        setStoredContext({});
      }
    };

    refreshContext();
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

  const assistantContext = useMemo(
    () => ({
      ...storedContext,
      ...context,
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
    }),
    [storedContext, context, activeGuideId, activeStepIndex, pathname]
  );

  const checklist = useMemo<ChecklistItem[]>(() => {
    const draft = storedContext.itrDraft as
      | { salary?: Record<string, string> }
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

    return [
      { label: "PAN/user verified", done: Boolean(storedContext.verifiedPan || storedContext.user) },
      { label: "Income draft started", done: hasSalary },
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

  const smartSuggestions = useMemo<SmartSuggestion[]>(() => {
    const isDone = (label: string) =>
      checklist.some((item) => item.label === label && item.done);
    const suggestions: SmartSuggestion[] = [];

    if (!isDone("PAN/user verified")) {
      suggestions.push({
        label: "Verify taxpayer",
        detail: "Start with identity details before filing.",
        kind: "route",
        value: "/import-data",
      });
    }

    if (!isDone("Income draft started")) {
      suggestions.push({
        label: "Enter income",
        detail: "Add salary data from Form 16.",
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
        detail: "Estimate old vs new regime using saved data.",
        kind: "message",
        value: "Compare old and new tax regimes using my saved draft.",
      });
    }

    if (readinessScore >= 60 && !isDone("Final review done")) {
      suggestions.push({
        label: "Review draft",
        detail: "Find missing fields and risky entries.",
        kind: "message",
        value: "Review my full ITR draft and tell me what is missing.",
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
  }, [checklist, pathname, readinessScore]);

  const addAssistantMessage = (text: string) => {
    const assistantMessage: Message = { sender: "assistant", text };
    setMessages((prev) =>
      [...prev, assistantMessage].slice(-MAX_STORED_MESSAGES)
    );
    // Sync with backend if logged in
    // saveToBackend(assistantMessage);
  };

  const applyAction = (action: AssistantAction) => {
    if (action.type === "set_local_storage") {
      try {
        const parsed = JSON.parse(localStorage.getItem(action.key) || "{}");
        const current =
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};
        const oldValue = getNestedValue(current, action.path);

        // Validation logic should live here or in a hook
        setNestedValue(current, action.path, action.value);
        localStorage.setItem(action.key, JSON.stringify(current));

        const auditEntry: AuditEntry = {
          id: `${Date.now()}-${action.key}-${action.path}`,
          timestamp: Date.now(),
          label: action.label || "Updated draft field",
          key: action.key,
          path: action.path,
          oldValue,
          newValue: action.value,
        };
        const nextAuditTrail = [auditEntry, ...readAuditTrail()].slice(
          0,
          MAX_AUDIT_ENTRIES
        );
        localStorage.setItem(STORAGE_KEYS.AUDIT_TRAIL, JSON.stringify(nextAuditTrail));
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

        addAssistantMessage(`${action.label || "Updated the draft"}.`);

        if (action.route && action.route !== pathname) {
          router.push(action.route);
        }
      } catch {
        addAssistantMessage("I could not update that field automatically.");
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
  };

  const executeActions = (actions: AssistantAction[] = []) => {
    const actionsNeedingConfirmation = actions.filter(
      (action) => action.type === "set_local_storage"
    );
    const immediateActions = actions.filter(
      (action) => action.type !== "set_local_storage"
    );

    immediateActions.forEach(applyAction);

    if (actionsNeedingConfirmation.length > 0) {
      setPendingActions(actionsNeedingConfirmation);
      addAssistantMessage("I can update that field for you. Review and apply it below.");
    }
  };

  const applyPendingActions = () => {
    pendingActions.forEach(applyAction);
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

    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/ai/bee-assistant", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
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
            : "Bee Assistant request failed.")
      );
      if (Array.isArray(data.actions)) {
        executeActions(data.actions);
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
                  {smartSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.kind}-${suggestion.value}`}
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
                      <div className="font-semibold text-gray-100">{entry.label}</div>
                      <div className="text-gray-500">
                        {entry.path}: {String(entry.oldValue ?? "empty")} {"->"}{" "}
                        {entry.newValue}
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

            {messages.map((msg, index) => (
              <div
                key={`${msg.sender}-${index}`}
                className={`max-w-[85%] px-4 py-3 text-sm shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                  msg.sender === "user"
                    ? "ml-auto bg-yellow-400 text-black rounded-2xl rounded-tr-none font-medium"
                    : "bg-white/10 text-slate-100 rounded-2xl rounded-tl-none border border-white/5"
                }`}
              >
                {renderMessageText(msg.text)}
              </div>
            ))}

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
