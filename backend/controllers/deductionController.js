import ITRDraft from "../models/ITRDraft.js";
import User from "../models/user.js";
import { fail } from "../utils/apiResponse.js";
import { recordAuditEvents } from "../services/auditTrailService.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { logger } from "../utils/safeLogger.js";
import {
  invalidateUserTaxContextCache,
  normalizeDraftForContext,
  sanitizeQueryError,
  userKeyInFilter,
} from "../utils/taxContextService.js";

const defaultDeductions = {
  section80C: "",
  healthInsurance: "",
  homeLoanInterest: "",
};

export const getDeductions = async (req, res) => {
  try {
    const workspace = await resolveWorkspaceOwner(req, "viewDocuments");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to view these deductions" });
    }

    const user = await User.findById(workspace.ownerUserId).lean();
    if (!user) return fail(res, { status: 404, message: "Authenticated user was not found" });

    const draft = normalizeDraftForContext(await ITRDraft.findOne({ userKey: userKeyInFilter(user) }).lean());
    const deductions = { ...defaultDeductions, ...(draft?.deductions || {}) };
    const hasDeductions = Object.values(deductions).some((value) => Number(String(value || "").replace(/,/g, "")) > 0);

    res.status(200).json({
      success: true,
      message: hasDeductions ? "Deductions fetched successfully" : "No deductions saved yet",
      data: {
        deductions,
        hasDeductions,
        emptyState: !hasDeductions,
        calculationStatus: "not_calculated",
        missingData: hasDeductions ? [] : ["deductions"],
      },
      deductions,
    });
  } catch (error) {
    logger.error("getDeductions error", error, {
      requestId: req.requestId,
      authenticated: Boolean(req.user?.id),
      service: "deductions",
      queryError: sanitizeQueryError(error),
    });
    fail(res, {
      status: 500,
      message: "Could not load deductions from MongoDB.",
      code: "DEDUCTIONS_LOAD_FAILED",
      data: {
        requestId: req.requestId,
        authenticated: Boolean(req.user?.id),
        service: "deductions",
        queryError: sanitizeQueryError(error),
      },
    });
  }
};

export const saveDeductions = async (req, res) => {
  try {
    const workspace = await resolveWorkspaceOwner(req, "editDraft");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to edit these deductions" });
    }

    const user = await User.findById(workspace.ownerUserId).lean();
    if (!user) return fail(res, { status: 404, message: "Authenticated user was not found" });

    const incomingDeductions = req.body?.deductions || req.body || {};
    delete incomingDeductions.ownerUserId;
    delete incomingDeductions.userId;
    delete incomingDeductions.workspaceOwnerId;
    const deductions = { ...defaultDeductions, ...incomingDeductions };
    const existing = normalizeDraftForContext(await ITRDraft.findOne({ userKey: userKeyInFilter(user) }).lean());
    const draft = await ITRDraft.findOneAndUpdate(
      { userKey: existing?.userKey || String(user._id) },
      {
        userKey: existing?.userKey || String(user._id),
        salary: existing?.salary || {},
        houseProperty: existing?.houseProperty || {},
        pgbp: existing?.pgbp || {},
        capitalGains: existing?.capitalGains || {},
        otherSources: existing?.otherSources || {},
        taxpayerProfile: existing?.taxpayerProfile || {},
        deductions,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await recordAuditEvents(
      Object.entries(deductions)
        .filter(([key, value]) => String(existing?.deductions?.[key] ?? "") !== String(value ?? ""))
        .map(([key, value]) => ({
          userId: workspace.ownerUserId,
          eventType: "deduction_update",
          entityType: "ITRDraft",
          entityId: draft._id,
          fieldKey: `deductions.${key}`,
          oldValue: existing?.deductions?.[key] ?? "",
          newValue: value ?? "",
          sourceType: req.body?.sourceType === "assistant" ? "assistant" : "manual",
          actorType: req.body?.sourceType === "assistant" ? "assistant" : "user",
          metadata: { userKey: draft.userKey },
        }))
    );
    invalidateUserTaxContextCache(workspace.ownerUserId);

    res.status(200).json({
      success: true,
      message: "Deductions saved successfully",
      data: { deductions: draft.deductions },
      deductions: draft.deductions,
    });
  } catch (error) {
    logger.error("saveDeductions error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while saving deductions" });
  }
};
