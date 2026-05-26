import crypto from "crypto";
import { analyzeTaxContext } from "../utils/taxEngine.js";
import { buildTaxIntelligenceReport } from "../services/taxIntelligenceService.js";
import { buildBeeReasoningResponse } from "../services/beeReasoningService.js";
import { getUserTaxContext } from "../utils/taxContextService.js";
import { buildAssistantActions } from "../utils/assistantActions.js";
import ReviewComment from "../models/ReviewComment.js";
import { logger } from "../utils/safeLogger.js";

const MAX_MESSAGE_CHARS = 2_000;
const MAX_MEMORY_CHARS = 1_000;

const sendAssistantJson = (res, status, payload, message) =>
  res.status(status).json({
    success: status < 400,
    message: message || payload.reply || "Bee Assistant response",
    data: payload,
    ...payload,
  });

const trimText = (value = "", maxLength = MAX_MESSAGE_CHARS) =>
  String(value).slice(0, maxLength).trim();

export const getBeeAssistantReply = async (req, res) => {
  const requestId = req.get?.("X-Request-Id") || crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const { message, memorySummary = "" } = req.body || {};
    const userMessage = trimText(message);
    const safeMemorySummary = trimText(memorySummary, MAX_MEMORY_CHARS);

    if (!userMessage) {
      logger.warn("bee_assistant_validation_failed", { requestId, reason: "empty_message", userId: req.user?.id });
      return sendAssistantJson(
        res,
        400,
        { reply: "Please send a message.", requestId },
        "Please send a message."
      );
    }

    if (String(message).length > MAX_MESSAGE_CHARS) {
      logger.warn("bee_assistant_validation_failed", { requestId, reason: "message_too_long", userId: req.user?.id });
      return sendAssistantJson(
        res,
        413,
        {
          reply: "That message is too long for the assistant. Please shorten it and try again.",
          requestId,
          retryable: true,
        },
        "Assistant message is too long"
      );
    }

    const context = await getUserTaxContext(req.user.id);
    if (!context) {
      return sendAssistantJson(
        res,
        404,
        {
          reply: "I could not load your authenticated TaxBee workspace.",
          requestId,
          retryable: true,
        },
        "Authenticated user was not found"
      );
    }

    const taxIntelligence = buildTaxIntelligenceReport(context);
    const taxAnalysis = analyzeTaxContext({
      currentDraft: context.draft,
      deductions: context.deductions,
      aisImport: context.aisImport,
      extractionReview: context.extractionReview,
      taxCredits: context.taxCredits,
    });
    const reviewerComments = await ReviewComment.find({
      workspaceOwnerId: req.user.id,
      status: "open",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const actions = buildAssistantActions({ message: userMessage, taxAnalysis });
    const groundedResponse = buildBeeReasoningResponse({
      message: userMessage,
      context,
      intelligence: taxIntelligence,
      reviewerComments,
      actions,
    });
    logger.info("bee_assistant_call_completed", {
      requestId,
      userId: req.user.id,
      latencyMs: Date.now() - startedAt,
      actionCount: actions.length,
      reviewerCommentCount: reviewerComments.length,
      degraded: false,
    });

    return sendAssistantJson(res, 200, {
      ...groundedResponse,
      memorySummary: safeMemorySummary,
      requestId,
      degraded: false,
    });
  } catch (error) {
    logger.error("Bee Assistant error", error, { requestId });

    return sendAssistantJson(
      res,
      500,
      {
        reply: "Bee Assistant could not load verified tax context right now. No tax estimate was produced.",
        requestId,
        retryable: true,
        degraded: true,
      },
      "Bee Assistant server error"
    );
  }
};

export const getBeeAssistantHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Bee Assistant healthy",
    data: {
      status: "ok",
      mode: "mongo-grounded-explainable",
      sourceOfTruth: "MongoDB tax context, tax intelligence, audit provenance, reviewer comments",
    },
  });
};
