type TaxApiResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  data?: {
    hasTaxData?: boolean;
    emptyState?: boolean;
    imports?: unknown[];
    extractionReview?: unknown[];
  } & Record<string, unknown> | null;
};

const staleItrDraftMongoPattern = /Could not load ITR draft from MongoDB|database connection is healthy/i;

export const isStaleItrDraftMongoMessage = (message = "") =>
  staleItrDraftMongoPattern.test(message);

export const isSuccessfulEmptyTaxResponse = (data: TaxApiResponse | null) =>
  Boolean(
    data?.success !== false &&
      (data?.data?.hasTaxData === false ||
        data?.data?.emptyState === true ||
        (Array.isArray(data?.data?.imports) &&
          data.data.imports.length === 0 &&
          Array.isArray(data?.data?.extractionReview) &&
          data.data.extractionReview.length === 0))
  );

export const shouldShowBackendLoadError = (res: Response, data: TaxApiResponse | null) =>
  res.status >= 500 ||
  data?.code === "TAX_CONTEXT_LOAD_FAILED" ||
  data?.code === "ITR_DRAFT_LOAD_FAILED" ||
  data?.code === "DASHBOARD_LOAD_FAILED";

export const statusForTaxLoadFailure = ({
  res,
  data,
  emptyMessage,
  fallbackMessage,
}: {
  res: Response;
  data: TaxApiResponse | null;
  emptyMessage: string;
  fallbackMessage: string;
}) => {
  const message = data?.message || fallbackMessage;

  if (isSuccessfulEmptyTaxResponse(data)) return emptyMessage;
  if (shouldShowBackendLoadError(res, data)) return message;
  if (isStaleItrDraftMongoMessage(message)) return emptyMessage;

  return message;
};
