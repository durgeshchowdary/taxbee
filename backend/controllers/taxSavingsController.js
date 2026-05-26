import { fail } from "../utils/apiResponse.js";
import { getUserTaxContext, sanitizeQueryError, TaxContextLoadError } from "../utils/taxContextService.js";
import { buildTaxIntelligenceReport } from "../services/taxIntelligenceService.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { logger } from "../utils/safeLogger.js";

export const getTaxSavings = async (req, res) => {
  try {
    const workspace = await resolveWorkspaceOwner(req, "viewDocuments");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to view tax savings for this workspace" });
    }

    const context = await getUserTaxContext(workspace.ownerUserId);
    if (!context) {
      return fail(res, { status: 404, message: "Authenticated user was not found" });
    }

    const taxIntelligence = buildTaxIntelligenceReport(context);
    const isNotCalculated = taxIntelligence.calculationStatus.calculationStatus === "not_calculated";
    const scenarios = isNotCalculated
      ? []
      : taxIntelligence.legacy.explanation.scenarioComparison;
    const recommendations = isNotCalculated
      ? []
      : taxIntelligence.deductionOpportunities.map((item) => ({
          ...item,
          detail: item.description,
          impact: 0,
        }));

    res.status(200).json({
      success: true,
      message:
        isNotCalculated
          ? "Import documents to calculate tax savings"
          : "Tax savings fetched successfully",
      data: {
        hasTaxData: context.hasTaxData,
        opportunities: recommendations,
        scenarios,
        recommendations,
        intelligence: taxIntelligence.legacy,
        taxIntelligence,
        calculationStatus: taxIntelligence.calculationStatus.calculationStatus,
        reason: isNotCalculated
          ? "Income and deductions are not available yet"
          : taxIntelligence.calculationStatus.reason,
        missingData: taxIntelligence.calculationStatus.missingFields,
      },
    });
  } catch (error) {
    logger.error("getTaxSavings error", error, {
      requestId: req.requestId,
      userId: req.user?.id,
      service: error instanceof TaxContextLoadError ? error.service : "tax savings",
    });
    fail(res, {
      status: 500,
      message:
        error instanceof TaxContextLoadError
          ? `${error.message}. Please retry after the database connection is healthy.`
          : "Server error while fetching tax savings",
      code: error instanceof TaxContextLoadError ? "TAX_CONTEXT_LOAD_FAILED" : "TAX_SAVINGS_LOAD_FAILED",
      data: {
        requestId: req.requestId,
        authenticated: Boolean(req.user?.id),
        service: error instanceof TaxContextLoadError ? error.service : "tax savings",
        queryError: sanitizeQueryError(error instanceof TaxContextLoadError ? error.cause : error),
      },
    });
  }
};
