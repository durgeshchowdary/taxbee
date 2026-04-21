import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import { analyzeTaxContext } from "../utils/taxEngine.js";
import { getRelevantTaxKnowledge } from "../utils/taxKnowledge.js";
import { buildAssistantActions } from "../utils/assistantActions.js";

const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_ITEMS = 30;
const MAX_MEMORY_CHARS = 1_000;
const AI_TIMEOUT_MS = 30_000;
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1_000;
const MAX_RESPONSE_CACHE_ENTRIES = 300;

const modelCache = new Map();
const responseCache = new Map();
const inFlightResponses = new Map();

const trimText = (value = "", maxLength = MAX_MESSAGE_CHARS) =>
  String(value).slice(0, maxLength).trim();

const hashText = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const getCachedModel = ({ apiKey, systemPrompt }) => {
  const key = hashText(`${apiKey}:${systemPrompt}`);
  const cachedModel = modelCache.get(key);
  if (cachedModel) return cachedModel;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 900,
    },
  });

  modelCache.set(key, model);
  if (modelCache.size > 20) {
    modelCache.delete(modelCache.keys().next().value);
  }

  return model;
};

const getCachedResponse = (cacheKey) => {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > RESPONSE_CACHE_TTL_MS) {
    responseCache.delete(cacheKey);
    return null;
  }

  return cached.value;
};

const setCachedResponse = (cacheKey, value) => {
  responseCache.set(cacheKey, { timestamp: Date.now(), value });

  if (responseCache.size > MAX_RESPONSE_CACHE_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value);
  }
};

const withTimeout = (promise, timeoutMs, label) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`${label} timed out`)),
      timeoutMs
    );

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });

const sanitizeHistory = (history = []) =>
  (Array.isArray(history) ? history : [])
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      sender: item?.sender === "assistant" ? "assistant" : "user",
      text: trimText(item?.text || "", 1_000),
    }))
    .filter((item) => item.text);

const getFallbackReply = ({ taxAnalysis, actions }) => {
  const nextIssues = [
    ...(taxAnalysis?.missingFields || []),
    ...(taxAnalysis?.warnings || []),
  ].slice(0, 3);

  if (nextIssues.length > 0) {
    return `I am having trouble reaching the AI model, but TaxBee can still help. Based on your saved draft, check these next:\n${nextIssues.join("\n")}`;
  }

  if (actions?.some((action) => action.type === "navigate")) {
    return "I am having trouble reaching the AI model, but I can still open the right TaxBee page for you.";
  }

  return "I am having trouble reaching the AI model. Your saved draft is safe, and you can try again in a moment.";
};

const getFastActionReply = ({ userMessage, actions }) => {
  const normalized = userMessage.toLowerCase();
  const storageAction = actions.find((action) => action.type === "set_local_storage");
  if (storageAction) {
    return `${storageAction.label || "I found a field update"}. Please review and apply it in the confirmation box.`;
  }

  const routeAction = actions.find((action) => action.type === "navigate");
  const isNavigationCommand =
    /\b(open|go to|take me|show|navigate|start|begin)\b/.test(normalized);

  if (routeAction && isNavigationCommand) {
    return `${routeAction.label || "Opening the right page"} now. I will guide you there.`;
  }

  return null;
};

const updateMemorySummary = async ({
  model,
  memorySummary,
  history,
  userMessage,
  assistantReply,
}) => {
  try {
    const memoryPrompt = JSON.stringify(
      {
        task:
          "Update Bee Assistant's long-term memory. Keep only durable facts useful for future tax/app help. Do not store secrets, passwords, full PAN, full email, API keys, or unnecessary personal data. Keep it under 120 words.",
        previousMemorySummary: memorySummary || "",
        recentChat: history,
        latestUserMessage: userMessage,
        latestAssistantReply: assistantReply,
      },
      null,
      2
    );

    const result = await model.generateContent(memoryPrompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Bee Assistant memory update error:", error);
    return memorySummary || "";
  }
};

export const getBeeAssistantReply = async (req, res) => {
  const requestId =
    req.get?.("X-Request-Id") ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const {
      message,
      section,
      context = {},
      history = [],
      memorySummary = "",
    } = req.body || {};
    const userMessage = trimText(message);
    const safeHistory = sanitizeHistory(history);
    const safeMemorySummary = trimText(memorySummary, MAX_MEMORY_CHARS);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!userMessage) {
      return res.status(400).json({ reply: "Please send a message.", requestId });
    }

    if (String(message).length > MAX_MESSAGE_CHARS) {
      return res.status(413).json({
        reply: "That message is too long for the assistant. Please shorten it and try again.",
        requestId,
        retryable: true,
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        reply: "Gemini API key is not configured.",
        requestId,
        degraded: true,
      });
    }

    const taxAnalysis = analyzeTaxContext(context);
    const taxKnowledge = getRelevantTaxKnowledge(userMessage, context);
    const actions = buildAssistantActions({ message: userMessage, taxAnalysis });
    const fastReply = getFastActionReply({ userMessage, actions });

    if (fastReply) {
      return res.status(200).json({
        reply: fastReply,
        memorySummary: safeMemorySummary,
        actions,
        requestId,
        fastPath: true,
        degraded: false,
      });
    }

    const systemPrompt = `You are Bee Assistant, a ChatGPT-like AI assistant inside TaxBee, an Indian ITR filing app.
Your style should feel natural, conversational, helpful, and adaptive like ChatGPT.

You can:
- answer normal conversational messages
- explain Indian tax concepts simply
- review the user's draft
- point out missing fields
- estimate tax from provided app data
- compare old vs new tax regime
- suggest deductions and next steps
- ask sharp follow-up questions when needed
- remember earlier user goals and preferences
- guide users through the TaxBee filing workflow step by step when filingWorkflow is present in appContext
- understand the full TaxBee website using appContext.site.pages and appContext.site.currentPage

Rules:
- Use taxAnalysis as the source of truth for all math, tax estimates, regime comparisons, missing fields, warnings, and recommendations.
- Use taxKnowledge as grounded real-world tax context. Prefer it over general model memory when it is relevant.
- When taxKnowledge contains a useful source URL and the user asks for rules, documents, deductions, or verification, mention the source briefly.
- Use longTermMemory and recentChat as conversation memory. Understand follow-up words like "that", "it", "same", "previous", "old one", and "new one" from prior messages.
- If the user asks what they asked before, summarize recentChat accurately.
- Do not invent user amounts. If data is missing, say what is missing and ask for it.
- Do not recalculate tax differently from taxAnalysis.
- Be explicit about confidence: say "based on the data entered so far" for app-specific estimates, and "please verify" for filing-critical claims.
- Keep answers concise by default, but expand when the user asks for detail.
- Use a friendly, calm tone. Avoid sounding like a fixed template.
- Prefer a direct answer first, then reasoning or next steps. Do not over-explain simple greetings.
- For complex tax questions, structure the answer with short bullets and a clear next action.
- If filingWorkflow is present, align guidance with its activeStep and tell the user exactly what to do on the current page.
- Use appContext.site.currentPage to know where the user currently is. If the user asks where to go, use appContext.site.pages and availableActions to route them.
- When opening a page would help, say what page is being opened and why.
- If the user's request is ambiguous, make a reasonable assumption and name it briefly, or ask one focused clarifying question.
- If the user asks something unrelated to tax or TaxBee, answer briefly if harmless, then gently bring the conversation back to tax help.
- Do not claim to be a CA/lawyer or final legal authority. For filing decisions, remind the user to verify with Form 16, AIS/26AS, TDS records, and official documents.
${section ? `Current TaxBee section: ${section}.` : ""}`;

    const userPrompt = JSON.stringify(
      {
        userMessage,
        longTermMemory: safeMemorySummary,
        recentChat: safeHistory,
        appContext: context,
        taxAnalysis,
        taxKnowledge,
        availableActions: actions,
        responseInstruction:
          "Answer the user directly and naturally. Use taxAnalysis when relevant, but do not dump raw JSON. If availableActions includes navigation, mention that TaxBee can open that page.",
      },
      null,
      2
    );

    const cacheKey = hashText(`${systemPrompt}:${userPrompt}`);
    const cachedResponse = getCachedResponse(cacheKey);

    if (cachedResponse) {
      return res.status(200).json({
        ...cachedResponse,
        requestId,
        cached: true,
      });
    }

    if (inFlightResponses.has(cacheKey)) {
      const sharedResponse = await inFlightResponses.get(cacheKey);
      return res.status(200).json({
        ...sharedResponse,
        requestId,
        shared: true,
      });
    }

    const model = getCachedModel({ apiKey, systemPrompt });

    const responsePromise = (async () => {
      let reply = "";
      let degraded = false;
      let updatedMemorySummary = safeMemorySummary;

      try {
        const result = await withTimeout(
          model.generateContent(userPrompt),
          AI_TIMEOUT_MS,
          "Bee Assistant"
        );
        reply = result.response.text();
        updatedMemorySummary = await withTimeout(
          updateMemorySummary({
            model,
            memorySummary: safeMemorySummary,
            history: safeHistory,
            userMessage,
            assistantReply: reply,
          }),
          8_000,
          "Bee Assistant memory update"
        ).catch((error) => {
          console.error(`Bee Assistant memory timeout [${requestId}]:`, error);
          return safeMemorySummary;
        });
      } catch (error) {
        console.error(`Bee Assistant model error [${requestId}]:`, error);
        degraded = true;
        reply = getFallbackReply({ taxAnalysis, actions });
      }

      return { reply, memorySummary: updatedMemorySummary, actions, degraded };
    })();

    inFlightResponses.set(cacheKey, responsePromise);
    const responsePayload = await responsePromise.finally(() => {
      inFlightResponses.delete(cacheKey);
    });

    if (!responsePayload.degraded) {
      setCachedResponse(cacheKey, responsePayload);
    }

    return res
      .status(200)
      .json({ ...responsePayload, requestId, cached: false });
  } catch (error) {
    console.error(`Bee Assistant error [${requestId}]:`, error);
    const message =
      error instanceof Error ? error.message : "Server error. Please try again.";

    return res.status(500).json({ reply: message, requestId, retryable: true });
  }
};

export const getBeeAssistantHealth = (req, res) => {
  res.status(200).json({
    status: "ok",
    modelCacheSize: modelCache.size,
    responseCacheSize: responseCache.size,
    inFlightResponses: inFlightResponses.size,
    responseCacheTtlMs: RESPONSE_CACHE_TTL_MS,
    maxResponseCacheEntries: MAX_RESPONSE_CACHE_ENTRIES,
  });
};
