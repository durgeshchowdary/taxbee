"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Brain,
  ChevronRight,
  FileText,
  PiggyBank,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { TAXBEE_SITE_MAP, STORAGE_KEYS } from "@/backend/utils/siteMap";
import { tokenize, calculateScore } from "@/backend/utils/nlp";
import { GUIDES, HIGH_VALUE_TAX_TERMS } from "@/backend/utils/BeeAssistantConfig";
import { buildTaxIntelligence } from "@/backend/utils/taxEngine";
import { apiFetch, clearLegacyAuthToken } from "@/app/_utils/authClient";
import {
  classifyBeeAssistantIntent,
  isLocalBeeAssistantIntent,
  isWorkflowBeeAssistantIntent,
  routeBeeAssistantIntent,
  type BeeAssistantIntent,
} from "@/app/_utils/beeAssistantIntent";

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

type WelcomePrompt = {
  label: string;
  action: "guide" | "message";
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

type ShaderAnimationProps = {
  status: "ready" | "degraded";
};

const MAX_STORED_MESSAGES = 60;
const MAX_HISTORY_MESSAGES = 40;
const MAX_AUDIT_ENTRIES = 100;
const ASSISTANT_TIMEOUT_MS = 40_000;

const quickPromptIconMap: Record<string, LucideIcon> = {
  "AIS Review": FileText,
  "Filing Risks": ShieldCheck,
  "Regime Advice": Brain,
  "Start Filing": ArrowRight,
  Deductions: ShieldCheck,
  Documents: UploadCloud,
  "Tax Savings": PiggyBank,
};

const welcomePrompts: WelcomePrompt[] = [
  { label: "Start Filing", action: "guide", value: "file-itr" },
  { label: "Upload Form 16", action: "guide", value: "documents" },
  { label: "Check Deductions", action: "message", value: "Help me check deductions I might be missing." },
  { label: "Compare Tax Regimes", action: "message", value: "Compare old and new tax regimes for me." },
  { label: "What can you do?", action: "message", value: "What can you do?" },
  { label: "Today's Tax Updates", action: "message", value: "What tax updates should I know about today?" },
];

const panelSpring = {
  type: "spring" as const,
  stiffness: 360,
  damping: 34,
};

function ShaderAnimation({ status }: ShaderAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vertexSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;

      vec3 palette(float t) {
        vec3 a = vec3(0.48, 0.23, 0.93);
        vec3 b = vec3(0.31, 0.27, 0.90);
        vec3 c = vec3(0.02, 0.71, 0.83);
        return mix(mix(a, b, smoothstep(0.0, 1.0, t)), c, smoothstep(0.35, 1.0, t));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= resolution.x / resolution.y;

        float wave = sin((p.x * 2.4) + time * 0.55) * 0.18;
        float flow = sin((p.y * 3.1) - time * 0.42 + cos(p.x * 2.0)) * 0.16;
        float ribbon = smoothstep(0.72, 0.08, abs(p.y + wave + flow));
        float glow = 0.42 / (0.36 + length(p - vec2(sin(time * 0.22) * 0.42, cos(time * 0.18) * 0.24)));
        float t = clamp(uv.x + uv.y * 0.35 + ribbon * 0.22 + glow * 0.08, 0.0, 1.0);

        vec3 color = palette(t);
        color += ribbon * vec3(0.24, 0.42, 0.62);
        color += glow * vec3(0.08, 0.16, 0.28);
        color = mix(color, vec3(1.0), 0.08);
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "position");
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");
    let frame = 0;
    let start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now: number) => {
      gl.useProgram(program);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frame = window.requestAnimationFrame(render);
    };

    resize();
    start = performance.now();
    frame = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (buffer) gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#7c3aed_0%,#4f46e5_42%,#06b6d4_100%)]">
      <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.7),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.38))]" />
      <div className="absolute left-4 top-4 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
      <div
        className={`absolute right-6 top-5 h-2 w-2 rounded-full ${
          status === "ready" ? "bg-emerald-200" : "bg-amber-200"
        } shadow-[0_0_26px_rgba(255,255,255,0.95)]`}
      />
    </div>
  );
}

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
  const headers = {
    "Content-Type": "application/json",
  };

  if (action.key === STORAGE_KEYS.DEDUCTIONS) {
    const getRes = await apiFetch("/api/deductions", { headers });
    const getData = await getRes.json().catch(() => ({}));
    if (!getRes.ok) throw new Error(getData.message || "Could not load deductions.");

    const current =
      getData.data?.deductions && typeof getData.data.deductions === "object"
        ? { ...getData.data.deductions }
        : {};
    const oldValue = getNestedValue(current, action.path);
    setNestedValue(current, action.path, action.value);

    const putRes = await apiFetch("/api/deductions", {
      method: "PUT",
      headers,
      body: JSON.stringify({ deductions: current, sourceType: "assistant" }),
    });
    const putData = await putRes.json().catch(() => ({}));
    if (!putRes.ok) throw new Error(putData.message || "Could not save deductions.");
    return { oldValue };
  }

  if (action.key === STORAGE_KEYS.ITR_DRAFT) {
    const getRes = await apiFetch("/api/itr-draft", { headers });
    const getData = await getRes.json().catch(() => ({}));
    if (!getRes.ok) throw new Error(getData.message || "Could not load ITR draft.");

    const current =
      getData.data?.draft && typeof getData.data.draft === "object"
        ? { ...getData.data.draft }
        : {};
    const oldValue = getNestedValue(current, action.path);
    setNestedValue(current, action.path, action.value);

    const putRes = await apiFetch("/api/itr-draft", {
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
  const [conversationMode, setConversationMode] = useState<"welcome" | "chat" | "workflow">("welcome");
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
        try {
          const res = await apiFetch("/api/tax-context");
          if (res.status === 401) {
            clearLegacyAuthToken();
          } else {
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
          }
        } catch {
          // Assistant will stay honest and avoid tax estimates without backend context.
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

  const userFirstName = useMemo(() => {
    const user = storedContext.user as { name?: string } | null | undefined;
    const name = user?.name?.trim();
    if (!name && typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}") as { name?: string };
        return saved.name?.split(/\s+/)[0] || "";
      } catch {
        return "";
      }
    }

    return name?.split(/\s+/)[0] || "";
  }, [storedContext.user]);

  const getContextualNextStep = () => {
    const openItem = checklist.find((item) => !item.done);
    const extractionReview = (storedContext.extractionReview || []) as ExtractionReviewRecord[];
    const pendingExtracted = extractionReview.filter((record) => record.status === "extracted").length;

    if (pendingExtracted > 0) {
      return `You have ${pendingExtracted} extracted field${pendingExtracted === 1 ? "" : "s"} waiting for review. The calm next step is to confirm or correct those values before trusting the draft.`;
    }

    if (openItem) {
      return `The next useful step is: ${openItem.label}. We can do that slowly and keep it simple.`;
    }

    return "Your visible checklist looks well progressed. The next step is a final review of income, deductions, TDS, and regime choice before filing.";
  };

  const getLocalConversationalReply = (message: string) => {
    const intent = classifyBeeAssistantIntent(message);
    if (!isLocalBeeAssistantIntent(intent)) return null;

    const greeting = userFirstName ? `Hey ${userFirstName}.` : "Hey.";

    const replies: Partial<Record<BeeAssistantIntent, string>> = {
      greeting: `${greeting}\nI am Bee Assistant.\n\nI can help you file taxes, explain deductions, review risks, or simply guide you step by step.`,
      small_talk: "I am doing great.\nAnd I am ready to help whenever you are.\n\nWhat would you like to work on today?",
      emotional_support: "I hear you.\nTax filing can feel heavy when there are too many forms, numbers, and rules at once. We can slow it down and handle one small step at a time.",
      confusion: "That is completely okay. Tax filing can feel confusing at first.\nI will keep the language simple and guide you step by step.\n\nA good first step is to upload or review your Form 16/AIS, then confirm income and deductions.",
      stress: "I understand. Let us slow things down.\nYou do not need to figure everything out at once, and you do not need to do it alone.\n\nWe can start with one small step: checking what information TaxBee already has.",
      gratitude: "You are welcome.\nI am glad that helped. We can keep going whenever you are ready.",
      capabilities: "I can help you like a TaxBee copilot.\n\nI can guide filing steps, explain deductions, compare regimes, review AIS/Form 26AS context, point out missing documents, clarify errors, and suggest what to do next based on your saved TaxBee workspace.\n\nI will not invent financial data or pretend to calculate from documents I cannot see.",
    };

    return replies[intent] || null;
  };

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
        const res = await apiFetch("/api/collaboration/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
    setConversationMode("workflow");
    setActiveGuideId(guide.id);
    navigateToStep(guide, stepIndex);
  };

  const navigateToStep = (guide: Guide, stepIndex: number) => {
    const step = guide.steps[stepIndex];
    if (!step) return;

    setActiveGuideId(guide.id);
    setActiveStepIndex(stepIndex);
    setIsOpen(true);
    setConversationMode("workflow");
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

  const handleWorkflowCommand = (userMessage: string, intent: BeeAssistantIntent) => {
    const normalized = userMessage.toLowerCase();

    const activeGuide = getActiveGuide();

    if (activeStepIndex !== null && activeGuide) {
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
        setConversationMode("chat");
        localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
        addAssistantMessage("Okay, I stopped the guided filing flow.");
        return true;
      }
    }

    if (!isWorkflowBeeAssistantIntent(intent)) return false;

    setConversationMode("workflow");

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

    if (intent === "continue_filing") {
      addAssistantMessage(`${getContextualNextStep()}\n\nI can keep guiding you from here.`);
      return true;
    }

    if (intent === "upload_help") {
      const guide = GUIDES.find((item) => item.id === "documents");
      if (guide) startGuide(guide, 0);
      return true;
    }

    if (intent === "filing_help") {
      const guide = GUIDES.find((item) => item.id === "file-itr");
      if (guide) startGuide(guide, 0);
      return true;
    }

    if (intent === "deduction_help") {
      const guide = GUIDES.find((item) => item.id === "deductions");
      if (guide) startGuide(guide, 0);
      return true;
    }

    if (intent === "workflow_trigger") {
      return false;
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

    const intentRoute = routeBeeAssistantIntent(userMessage);
    const { intent } = intentRoute;

    const localReply = getLocalConversationalReply(userMessage);
    if (intentRoute.handling === "local" && localReply) {
      setConversationMode("chat");
      setLoading(true);
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      addAssistantMessage(localReply);
      setLoading(false);
      return;
    }

    if (intentRoute.handling === "workflow" && handleWorkflowCommand(userMessage, intent)) return;

    const groundedReply = /\b(guide|open|go to|take me|next page)\b/i.test(userMessage)
      ? getGroundedCopilotReply(userMessage)
      : null;
    if (groundedReply) {
      addAssistantMessage(groundedReply);
      return;
    }

    setConversationMode(intentRoute.handling === "workflow" ? "workflow" : "chat");
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);

    try {
      const res = await apiFetch("/api/ai/bee-assistant", {
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
      if (res.status === 401) {
        clearLegacyAuthToken();
        data = {
          ...data,
          reply: "Your TaxBee session has expired. Please log in again, then reopen Bee Assistant.",
          degraded: true,
          retryable: false,
        };
      }
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
      <div className="mt-3 rounded-2xl border border-indigo-100/80 bg-white/65 p-3 text-[11px] leading-5 text-slate-600 shadow-inner shadow-white/60 backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {typeof explainability.confidence === "number" && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
              Confidence {explainability.confidence}/100
            </span>
          )}
          {states && (
            <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-cyan-800">
              {states.confirmed || 0} confirmed · {states.extracted || 0} extracted · {states.overridden || 0} overridden
            </span>
          )}
        </div>
        {basedOn.length > 0 && <div className="mt-2">Based on: {basedOn.slice(0, 4).join(", ")}</div>}
        {sourceFields.length > 0 && <div>Fields: {sourceFields.slice(0, 4).join(", ")}</div>}
        {sourceDocuments.length > 0 && <div>Sources: {sourceDocuments.slice(0, 3).join(", ")}</div>}
        {basis.length > 0 && <div>Basis: {basis.slice(0, 2).join(" ")}</div>}
        {missingData.length > 0 && <div className="text-amber-700">Missing: {missingData.slice(0, 4).join(", ")}</div>}
        {warnings.length > 0 && <div className="text-rose-700">Warnings: {warnings.slice(0, 3).join(" ")}</div>}
        {auditRefs.length > 0 && <div>Audit refs: {auditRefs.slice(0, 3).join(", ")}</div>}
      </div>
    );
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    setActiveGuideId(null);
    setActiveStepIndex(null);
    setConversationMode("welcome");
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

  const activeGuide = getActiveGuide();
  const activeStep =
    activeStepIndex === null || !activeGuide
      ? null
      : activeGuide.steps[activeStepIndex];
  const hasUserMessages = messages.some((message) => message.sender === "user");
  const hasActiveAssistantWork =
    Boolean(activeStep) ||
    hasUserMessages ||
    pendingActions.length > 0 ||
    Boolean(lastFailedMessage) ||
    loading;
  const dismissGuideOffer = (messageIndex: number) => {
    setMessages((prev) =>
      prev.map((message, index) =>
        index === messageIndex ? { ...message, guideOfferId: undefined } : message
      )
    );
  };

  const renderGuideOffer = (guide: Guide, messageIndex: number) => (
    <div className="mt-3 rounded-2xl border border-violet-100 bg-white/70 p-3 shadow-sm shadow-violet-100/70 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
        <WandSparkles className="h-3.5 w-3.5" />
        Guided help available
      </div>
      <div className="mt-1 font-bold text-slate-950">{guide.title}</div>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        I can open each page and explain what to do there.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => startGuide(guide, 0)}
          className="rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:scale-[1.03]"
        >
          Guide me
        </button>
        <button
          type="button"
          onClick={() => dismissGuideOffer(messageIndex)}
          className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Not now
        </button>
      </div>
    </div>
  );

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full border border-white/50 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(79,70,229,0.22)] backdrop-blur-2xl transition focus:outline-none focus:ring-2 focus:ring-violet-400 sm:bottom-6 sm:right-6"
        aria-expanded={isOpen}
        aria-label="Open Bee Assistant"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
          <Bot className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
        </span>
        <span className="hidden sm:block">Bee Assistant</span>
        <Sparkles className="hidden h-4 w-4 text-violet-500 sm:block" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 34, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={panelSpring}
            className="fixed inset-x-3 bottom-3 z-40 flex h-[86dvh] flex-col overflow-hidden rounded-[2rem] border border-white/45 bg-white/45 text-slate-900 shadow-[0_24px_90px_rgba(15,23,42,0.18)] ring-1 ring-indigo-100/60 backdrop-blur-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(760px,calc(100vh-7rem))] sm:w-[440px]"
            role="dialog"
            aria-label="Bee Assistant AI copilot"
          >
            <div className="relative h-[162px] shrink-0 overflow-visible">
              <ShaderAnimation status={assistantStatus} />
              <div className="absolute inset-0 flex flex-col justify-between p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-white/80">
                      <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.95)]" />
                      {assistantStatus === "ready" ? "Ready" : "Degraded mode"}
                    </div>
                    <h2 className="mt-2 text-2xl font-bold text-white drop-shadow-sm">
                      Bee Assistant
                    </h2>
                    <p className="mt-1 max-w-[270px] text-xs leading-5 text-white/82">
                      AI tax copilot with grounded review, filing guidance, and memory.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMemory}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/18 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-xl transition hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/70"
                      title="Turn saved assistant memory on or off"
                    >
                      <Brain className="h-3.5 w-3.5" />
                      {memoryEnabled ? "Memory" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={clearChat}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-white/18 text-white shadow-sm backdrop-blur-xl transition hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/70"
                      aria-label="Clear chat"
                      title="Clear chat"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-white/18 text-white shadow-sm backdrop-blur-xl transition hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/70"
                      aria-label="Close Bee Assistant"
                      title="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <motion.div
                animate={{ y: [0, -3, 0], scale: [1, 1.025, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-8 left-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/70 bg-white/72 shadow-[0_16px_50px_rgba(79,70,229,0.26)] backdrop-blur-2xl"
              >
                <div className="absolute inset-1 rounded-[1.35rem] bg-gradient-to-br from-violet-500/14 via-indigo-500/10 to-cyan-400/20" />
                <Bot className="relative h-8 w-8 text-violet-700" />
              </motion.div>
            </div>

            {hasActiveAssistantWork ? (
              <>
                {activeStep && (
                  <div className="mx-4 mt-10 rounded-3xl border border-indigo-100 bg-white/68 p-4 text-xs shadow-sm shadow-indigo-100/60 backdrop-blur-xl sm:mx-5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-violet-700">
                      <span className="font-bold uppercase">
                        {activeGuide?.title}: Step {activeStepIndex! + 1} of {activeGuide?.steps.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStepIndex(null);
                          setActiveGuideId(null);
                          localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
                        }}
                        className="rounded-full px-2 py-1 font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Stop
                      </button>
                    </div>
                    <div className="text-sm font-bold text-slate-950">{activeStep.label}</div>
                    <div className="mt-1 leading-5 text-slate-600">{activeStep.instruction}</div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => activeGuide && navigateToStep(activeGuide, Math.max(activeStepIndex! - 1, 0))}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 shadow-sm disabled:opacity-40"
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
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-3 py-1.5 font-semibold text-white shadow-lg shadow-indigo-500/20"
                      >
                        {activeGuide && activeStepIndex === activeGuide.steps.length - 1 ? "Finish" : "Next"}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <div className={`flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-10 sm:px-5 ${activeStep ? "pt-4" : ""}`}>
                  {pendingActions.length > 0 && (
                    <section className="rounded-3xl border border-violet-200 bg-violet-50/80 p-4 shadow-lg shadow-violet-200/30 backdrop-blur-xl">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-violet-700">
                        <ShieldCheck className="h-4 w-4" />
                        Confirm update
                      </div>
                      <div className="space-y-1 text-xs text-slate-700">
                        {pendingActions.map((action, index) => (
                          <div key={`${action.type}-${index}`}>
                            {action.type === "set_local_storage" ? action.label || "Update draft field" : action.label || "Assistant action"}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={applyPendingActions} className="rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20">
                          Apply
                        </button>
                        <button type="button" onClick={cancelPendingActions} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600">
                          Cancel
                        </button>
                      </div>
                    </section>
                  )}

                  {lastFailedMessage && (
                    <section className="rounded-3xl border border-rose-200 bg-rose-50/85 p-4 shadow-sm backdrop-blur-xl">
                      <div className="text-xs font-semibold text-rose-800">Last request did not complete</div>
                      <div className="mt-1 line-clamp-2 text-xs text-rose-700">{lastFailedMessage}</div>
                      <button type="button" onClick={() => void sendMessage(lastFailedMessage)} disabled={loading} className="mt-3 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                        Retry
                      </button>
                    </section>
                  )}

                  {smartSuggestions.length > 0 && conversationMode === "workflow" && (
                    <section className="rounded-3xl border border-violet-100 bg-white/62 p-4 shadow-sm shadow-violet-100/60 backdrop-blur-xl">
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-violet-700">
                        <WandSparkles className="h-4 w-4" />
                        Next best actions
                      </div>
                      <div className="space-y-2">
                        {smartSuggestions.map((suggestion, index) => (
                          <motion.button
                            key={`${suggestion.kind}-${suggestion.value}-${suggestion.label}-${index}`}
                            type="button"
                            onClick={() => runSmartSuggestion(suggestion)}
                            disabled={loading}
                            whileHover={{ x: 2 }}
                            className="group relative w-full overflow-hidden rounded-2xl border border-indigo-100 bg-white/72 px-3 py-3 text-left text-xs text-slate-700 shadow-sm transition disabled:opacity-60"
                          >
                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                            <span className="relative flex items-start justify-between gap-3">
                              <span>
                                <span className="block font-semibold text-slate-950">{suggestion.label}</span>
                                <span className="mt-1 block leading-5 text-slate-500">{suggestion.detail}</span>
                              </span>
                              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </section>
                  )}

                  {messages.map((msg, index) => {
                    const messageGuide = msg.guideOfferId ? GUIDES.find((guide) => guide.id === msg.guideOfferId) ?? null : null;

                    return (
                      <motion.div
                        key={`${msg.sender}-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className={`max-w-[88%] px-4 py-3 text-sm leading-6 shadow-sm ${msg.sender === "user" ? "ml-auto rounded-3xl rounded-br-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 font-medium text-white shadow-indigo-500/20" : "rounded-3xl rounded-bl-lg border border-white/70 bg-white/72 text-slate-700 shadow-slate-200/70 backdrop-blur-xl"}`}
                      >
                        {renderMessageText(msg.text)}
                        {msg.sender === "assistant" ? renderExplainability(msg.explainability) : null}
                        {messageGuide ? renderGuideOffer(messageGuide, index) : null}
                      </motion.div>
                    );
                  })}

                  {loading && (
                    <div className="flex w-fit items-center gap-1 rounded-3xl rounded-bl-lg border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur-xl">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10">
                <div className="absolute left-8 top-10 h-28 w-28 rounded-full bg-cyan-300/25 blur-3xl" />
                <div className="absolute bottom-12 right-8 h-32 w-32 rounded-full bg-violet-400/20 blur-3xl" />
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="relative w-full max-w-[350px] rounded-3xl border border-white/70 bg-white/68 px-6 py-8 text-center shadow-[0_24px_70px_rgba(79,70,229,0.16)] backdrop-blur-2xl"
                >
                  <motion.div
                    animate={{ y: [0, -5, 0], scale: [1, 1.04, 1] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                    className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/80 bg-white/75 shadow-[0_18px_55px_rgba(6,182,212,0.24)]"
                  >
                    <span className="absolute h-24 w-24 rounded-full bg-gradient-to-br from-violet-400/20 to-cyan-300/25 blur-xl" />
                    <Bot className="relative h-10 w-10 text-violet-700" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-slate-950">
                    Hi, I&apos;m <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Bee Assistant</span>.
                  </h3>
                  <p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-slate-500">
                    I can guide you through filing your ITR step by step.
                  </p>
                  <div className="mt-7 grid gap-2 sm:grid-cols-2">
                    {welcomePrompts.map((prompt, index) => (
                      <motion.button
                        key={prompt.label}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * index, duration: 0.32 }}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (prompt.action === "guide") {
                            const guide = GUIDES.find((item) => item.id === prompt.value);
                            if (guide) startGuide(guide, 0);
                            return;
                          }

                          void sendMessage(prompt.value);
                        }}
                        className="rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition"
                      >
                        {prompt.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
            {hasActiveAssistantWork && (
              <div className="border-t border-white/50 bg-white/42 px-4 py-3 backdrop-blur-2xl sm:px-5">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {quickPrompts.map((prompt) => {
                    const PromptIcon = quickPromptIconMap[prompt.label] || Sparkles;
                    return (
                      <button key={prompt.label} type="button" onClick={() => void sendMessage(prompt.text)} disabled={loading} className="group relative shrink-0 overflow-hidden rounded-full border border-indigo-100 bg-white/72 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700 disabled:opacity-60">
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-violet-100/80 to-transparent opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                        <span className="relative flex items-center gap-1.5">
                          <PromptIcon className="h-3.5 w-3.5" />
                          {prompt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border border-white/70 bg-white/75 p-1.5 shadow-[0_12px_40px_rgba(79,70,229,0.13)] backdrop-blur-xl focus-within:ring-2 focus-within:ring-violet-300/80">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Bee about deductions, risks, regimes..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    aria-label="Ask Bee Assistant"
                  />
                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 transition disabled:cursor-not-allowed disabled:opacity-60" aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </motion.button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
