import ImportedDocument from "../models/ImportedDocument.js";
import { fail } from "../utils/apiResponse.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { logger } from "../utils/safeLogger.js";

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeSearchResult = (doc) => ({
  id: String(doc._id),
  documentType: doc.documentType,
  fileName: doc.fileName,
  reviewStatus: doc.reviewStatus,
  importedAt: doc.importedAt,
  matchedFields: (doc.extractedFields || []).slice(0, 8).map((field) => ({
    label: field.label,
    path: field.path,
    value: field.value,
    confidence: field.confidence,
    status: field.status,
    mappedSection: field.mappedSection,
  })),
});

export const searchDocuments = async (req, res) => {
  try {
    const workspace = await resolveWorkspaceOwner(req, "viewDocuments");

    if (!workspace.allowed) {
      return fail(res, {
        status: 403,
        message: "You do not have permission to search documents",
      });
    }

    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 20), 50);

    if (!q || q.length < 2) {
      return fail(res, {
        status: 400,
        message: "Search query must be at least 2 characters",
      });
    }

    const regex = new RegExp(escapeRegex(q), "i");

    const results = await ImportedDocument.find({
      userId: workspace.ownerUserId,
      $or: [
        { documentType: regex },
        { fileName: regex },
        { reviewStatus: regex },
        { "extractedFields.label": regex },
        { "extractedFields.path": regex },
        { "extractedFields.value": regex },
        { "extractedFields.mappedSection": regex },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("documentType fileName reviewStatus importedAt extractedFields")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Search results fetched successfully",
      data: {
        query: q,
        count: results.length,
        results: results.map(serializeSearchResult),
      },
    });
  } catch (error) {
    logger.error("searchDocuments error", error, {
      requestId: req.requestId,
      userId: req.user?.id,
    });

    return fail(res, {
      status: 500,
      message: "Server error while searching documents",
    });
  }
};