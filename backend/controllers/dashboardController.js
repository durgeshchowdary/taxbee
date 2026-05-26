import { fail } from "../utils/apiResponse.js";
import { getUserTaxContext, sanitizeQueryError, TaxContextLoadError } from "../utils/taxContextService.js";
import { buildTaxIntelligenceReport } from "../services/taxIntelligenceService.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { logger } from "../utils/safeLogger.js";

const buildDashboardPayload = (context) => {
  const taxIntelligence = buildTaxIntelligenceReport(context);
  if (taxIntelligence.calculationStatus.calculationStatus === "not_calculated") {
    return {
      ...context,
      taxIntelligence,
      summary: null,
      message: taxIntelligence.calculationStatus.reason,
    };
  }
  const intelligence = taxIntelligence.legacy;

  return {
    ...context,
    taxIntelligence,
    intelligence,
    summary: {
      totalIncome: Math.round(intelligence.analysis.income.grossTotalIncome),
      deductionUsed: Math.round(intelligence.analysis.deductions.oldRegimeDeductions),
      oldRegimeEstimate: taxIntelligence.oldRegimeEstimate,
      newRegimeEstimate: taxIntelligence.newRegimeEstimate,
      bestTax: taxIntelligence.estimatedTaxPayable,
      filingCompletion: taxIntelligence.filingReadinessScore,
      importStatus: context.aisImport ? "imported" : "missing",
      missingDocuments: taxIntelligence.missingDocuments,
      anomalyFlags: taxIntelligence.anomalyFlags,
      suggestions: taxIntelligence.actionRecommendations,
      dataQuality: intelligence.dataQuality,
      taxCredits: intelligence.taxCredits,
      calculationStatus: taxIntelligence.calculationStatus,
    },
  };
};

export const getDashboard = async (req, res) => {
  try {
    if (!req.user?.id) {
      return fail(res, {
        status: 401,
        message: "Authentication token is required",
        code: "AUTH_REQUIRED",
      });
    }

    const workspace = await resolveWorkspaceOwner(req, "viewDocuments");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to view this dashboard" });
    }

    const context = await getUserTaxContext(workspace.ownerUserId);
    if (!context) {
      return fail(res, { status: 404, message: "Authenticated user was not found" });
    }
    const dashboard = buildDashboardPayload(context);

    return res.status(200).json({
      success: true,
      message: dashboard.hasTaxData
        ? "Dashboard aggregation fetched successfully"
        : "No tax data available yet",
      data: {
        ...dashboard,
      },
    });
  } catch (error) {
    logger.error("getDashboard error", error, {
      requestId: req.requestId,
      userId: req.user?.id,
      service: error instanceof TaxContextLoadError ? error.service : "dashboard",
    });
    return fail(res, {
      status: 500,
      message:
        error instanceof TaxContextLoadError
          ? `${error.message}. Please retry after the database connection is healthy.`
          : "Server error while loading dashboard",
      code: error instanceof TaxContextLoadError ? "TAX_CONTEXT_LOAD_FAILED" : "DASHBOARD_LOAD_FAILED",
      data: {
        requestId: req.requestId,
        authenticated: Boolean(req.user?.id),
        service: error instanceof TaxContextLoadError ? error.service : "dashboard",
        queryError: sanitizeQueryError(error instanceof TaxContextLoadError ? error.cause : error),
      },
    });
  }
};
