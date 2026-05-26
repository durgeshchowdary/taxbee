import { fail } from "../utils/apiResponse.js";
import { getUserTaxContext, sanitizeQueryError, TaxContextLoadError } from "../utils/taxContextService.js";
import { buildTaxIntelligenceReport } from "../services/taxIntelligenceService.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { logger } from "../utils/safeLogger.js";

export const getTaxContext = async (req, res) => {
  try {
    const workspace = await resolveWorkspaceOwner(req, "viewDocuments");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to view this tax context" });
    }

    const context = await getUserTaxContext(workspace.ownerUserId);
    if (!context) {
      return fail(res, { status: 404, message: "Authenticated user was not found" });
    }

    const taxIntelligence = buildTaxIntelligenceReport(context);

    res.status(200).json({
      success: true,
      message: context.hasTaxData ? "Tax context fetched successfully" : "No tax data available yet",
      data: { ...context, taxIntelligence, intelligence: taxIntelligence.legacy },
      context: { ...context, taxIntelligence, intelligence: taxIntelligence.legacy },
    });
  } catch (error) {
    logger.error("getTaxContext error", error, {
      requestId: req.requestId,
      userId: req.user?.id,
      service: error instanceof TaxContextLoadError ? error.service : "tax context",
    });
    fail(res, {
      status: 500,
      message:
        error instanceof TaxContextLoadError
          ? `${error.message}. Please retry after the database connection is healthy.`
          : "Server error while fetching tax context",
      code: error instanceof TaxContextLoadError ? "TAX_CONTEXT_LOAD_FAILED" : "TAX_CONTEXT_FAILED",
      data: {
        requestId: req.requestId,
        authenticated: Boolean(req.user?.id),
        service: error instanceof TaxContextLoadError ? error.service : "tax context",
        queryError: sanitizeQueryError(error instanceof TaxContextLoadError ? error.cause : error),
      },
    });
  }
};
