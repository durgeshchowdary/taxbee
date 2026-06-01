import ImportedDocument from "../models/ImportedDocument.js";
import AuditEvent from "../models/AuditEvent.js";
import ReviewComment from "../models/ReviewComment.js";
import ITRDraft from "../models/ITRDraft.js";
import { fail } from "../utils/apiResponse.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { logger } from "../utils/safeLogger.js";

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const clampLimit = (value) => Math.min(Math.max(Number(value || 20), 1), 50);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const serializeDocument = (doc) => ({
  type: "document",
  id: String(doc._id),
  documentType: doc.documentType,
  fileName: doc.fileName,
  reviewStatus: doc.reviewStatus,
  lifecycleStatus: doc.lifecycleStatus,
  importedAt: doc.importedAt,
  updatedAt: doc.updatedAt,
  matchedFields: (doc.extractedFields || []).slice(0, 8).map((field) => ({
    label: field.label,
    path: field.path,
    value: field.value,
    confidence: field.confidence,
    status: field.status,
    mappedSection: field.mappedSection,
  })),
});

const serializeAuditEvent = (event) => ({
  type: "audit_event",
  id: String(event._id),
  eventType: event.eventType,
  entityType: event.entityType,
  entityId: event.entityId,
  sourceType: event.sourceType,
  actorType: event.actorType,
  createdAt: event.createdAt,
  metadata: event.metadata,
});

const serializeReviewComment = (comment) => ({
  type: "review_comment",
  id: String(comment._id),
  documentId: comment.importedDocumentId,
  fieldPath: comment.fieldPath,
  message: comment.message,
  status: comment.status,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

const serializeDraft = (draft) => ({
  type: "itr_draft",
  id: String(draft._id),
  assessmentYear: draft.assessmentYear,
  filingStatus: draft.filingStatus,
  regime: draft.regime,
  updatedAt: draft.updatedAt,
});

const buildDateFilter = ({ from, to }) => {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (!fromDate && !toDate) return {};

  return {
    createdAt: {
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    },
  };
};

const searchImportedDocuments = async ({
  ownerUserId,
  regex,
  q,
  limit,
  documentType,
  reviewStatus,
  includeDeleted,
  from,
  to,
}) => {
  const filter = {
    userId: ownerUserId,
    ...(includeDeleted === "true" ? {} : { deletedAt: null }),
    ...buildDateFilter({ from, to }),
    ...(documentType ? { documentType } : {}),
    ...(reviewStatus ? { reviewStatus } : {}),
    ...(q
      ? {
          $or: [
            { documentType: regex },
            { fileName: regex },
            { reviewStatus: regex },
            { lifecycleStatus: regex },
            { "extractedFields.label": regex },
            { "extractedFields.path": regex },
            { "extractedFields.value": regex },
            { "extractedFields.mappedSection": regex },
            { "extractedFields.status": regex },
          ],
        }
      : {}),
  };

  const results = await ImportedDocument.find(filter)
    .sort({ updatedAt: -1, importedAt: -1 })
    .limit(limit)
    .select(
      "documentType fileName reviewStatus lifecycleStatus importedAt updatedAt extractedFields"
    )
    .lean();

  return results.map(serializeDocument);
};

const searchAuditEvents = async ({ ownerUserId, regex, q, limit, from, to }) => {
  const filter = {
    userId: ownerUserId,
    ...buildDateFilter({ from, to }),
    ...(q
      ? {
          $or: [
            { eventType: regex },
            { entityType: regex },
            { entityId: regex },
            { sourceType: regex },
            { actorType: regex },
          ],
        }
      : {}),
  };

  const results = await AuditEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("eventType entityType entityId sourceType actorType createdAt metadata")
    .lean();

  return results.map(serializeAuditEvent);
};

const searchReviewComments = async ({ ownerUserId, regex, q, limit, from, to }) => {
  const filter = {
    userId: ownerUserId,
    ...buildDateFilter({ from, to }),
    ...(q
      ? {
          $or: [
            { fieldPath: regex },
            { message: regex },
            { status: regex },
          ],
        }
      : {}),
  };

  const results = await ReviewComment.find(filter)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .select("importedDocumentId fieldPath message status createdAt updatedAt")
    .lean();

  return results.map(serializeReviewComment);
};

const searchDrafts = async ({ ownerUserId, regex, q, limit, from, to }) => {
  const filter = {
    userId: ownerUserId,
    ...buildDateFilter({ from, to }),
    ...(q
      ? {
          $or: [
            { assessmentYear: regex },
            { filingStatus: regex },
            { regime: regex },
          ],
        }
      : {}),
  };

  const results = await ITRDraft.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("assessmentYear filingStatus regime updatedAt")
    .lean();

  return results.map(serializeDraft);
};

export const searchDocuments = async (req, res) => {
  try {
    const workspace = await resolveWorkspaceOwner(req, "viewDocuments");

    if (!workspace.allowed) {
      return fail(res, {
        status: 403,
        message: "You do not have permission to search this workspace",
      });
    }

    const q = String(req.query.q || "").trim();
    const scope = String(req.query.scope || "documents").trim();
    const limit = clampLimit(req.query.limit);
    const regex = q ? new RegExp(escapeRegex(q), "i") : null;

    if (q && q.length < 2) {
      return fail(res, {
        status: 400,
        message: "Search query must be at least 2 characters",
      });
    }

    const params = {
      ownerUserId: workspace.ownerUserId,
      regex,
      q,
      limit,
      from: req.query.from,
      to: req.query.to,
      documentType: req.query.documentType,
      reviewStatus: req.query.reviewStatus,
      includeDeleted: req.query.includeDeleted,
    };

    let results = [];

    if (scope === "documents") {
      results = await searchImportedDocuments(params);
    } else if (scope === "audit") {
      results = await searchAuditEvents(params);
    } else if (scope === "comments") {
      results = await searchReviewComments(params);
    } else if (scope === "drafts") {
      results = await searchDrafts(params);
    } else if (scope === "all") {
      const [documents, auditEvents, comments, drafts] = await Promise.all([
        searchImportedDocuments(params),
        searchAuditEvents(params),
        searchReviewComments(params),
        searchDrafts(params),
      ]);

      results = [...documents, ...auditEvents, ...comments, ...drafts]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || b.importedAt || 0) -
            new Date(a.updatedAt || a.createdAt || a.importedAt || 0)
        )
        .slice(0, limit);
    } else {
      return fail(res, {
        status: 400,
        message: "Invalid search scope",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Search results fetched successfully",
      data: {
        query: q,
        scope,
        count: results.length,
        filters: {
          from: req.query.from || null,
          to: req.query.to || null,
          documentType: req.query.documentType || null,
          reviewStatus: req.query.reviewStatus || null,
          includeDeleted: req.query.includeDeleted === "true",
        },
        results,
      },
    });
  } catch (error) {
    logger.error("searchDocuments error", error, {
      requestId: req.requestId,
      userId: req.user?.id,
    });

    return fail(res, {
      status: 500,
      message: "Server error while searching",
    });
  }
};