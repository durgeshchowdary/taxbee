import { fail } from "../utils/apiResponse.js";
import { listAuditTimeline, listValueTimeline } from "../services/auditTrailService.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { sanitizeText } from "../middleware/validationMiddleware.js";
import { logger } from "../utils/safeLogger.js";

export const getAuditTimeline = async (req, res) => {
  try {
    const workspace = await resolveWorkspaceOwner(req, "viewAuditTimeline");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to view this audit timeline" });
    }

    const events = await listAuditTimeline({
      userId: workspace.ownerUserId,
      limit: req.query.limit,
      page: req.query.page,
      skip: req.query.skip,
    });

    res.status(200).json({
      success: true,
      message: "Audit timeline fetched successfully",
      data: { events: events.events, pagination: events.pagination },
      events: events.events,
      pagination: events.pagination,
    });
  } catch (error) {
    logger.error("getAuditTimeline error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while fetching audit timeline" });
  }
};

export const getValueAuditTimeline = async (req, res) => {
  try {
    const fieldKey = sanitizeText(req.params.fieldKey, 200);
    if (!fieldKey) return fail(res, { status: 400, message: "fieldKey is required" });

    const workspace = await resolveWorkspaceOwner(req, "viewAuditTimeline");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to view this audit timeline" });
    }

    const events = await listValueTimeline({
      userId: workspace.ownerUserId,
      fieldKey,
      limit: req.query.limit,
      page: req.query.page,
      skip: req.query.skip,
    });

    res.status(200).json({
      success: true,
      message: "Value audit timeline fetched successfully",
      data: { fieldKey, events: events.events, pagination: events.pagination },
      fieldKey,
      events: events.events,
      pagination: events.pagination,
    });
  } catch (error) {
    logger.error("getValueAuditTimeline error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while fetching value audit timeline" });
  }
};
