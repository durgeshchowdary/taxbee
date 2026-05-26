import { logger } from "../utils/safeLogger.js";

const OCR_PROVIDERS = new Set(["none", "tesseract", "managed"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export class OcrProviderError extends Error {
  constructor(message, { code = "OCR_FAILED", status = 422, metadata = {} } = {}) {
    super(message);
    this.name = "OcrProviderError";
    this.code = code;
    this.status = status;
    this.metadata = metadata;
  }
}

export const getOcrProviderName = () => {
  const provider = String(process.env.OCR_PROVIDER || "none").trim().toLowerCase();
  return OCR_PROVIDERS.has(provider) ? provider : "none";
};

export const validateOcrProvider = () => {
  const provider = String(process.env.OCR_PROVIDER || "none").trim().toLowerCase();
  if (!OCR_PROVIDERS.has(provider)) {
    throw new Error(`OCR_PROVIDER must be one of: ${Array.from(OCR_PROVIDERS).join(", ")}`);
  }
  return provider;
};

const withTimeout = async (promise, timeoutMs) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new OcrProviderError("OCR timed out before completion", { code: "OCR_TIMEOUT", status: 504 }));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const ensureImageSafeguards = ({ buffer }) => {
  const maxBytes = Number(process.env.OCR_MAX_IMAGE_BYTES || DEFAULT_MAX_IMAGE_BYTES);
  if (!buffer?.length) {
    throw new OcrProviderError("Image file was empty", { code: "OCR_EMPTY_IMAGE", status: 422 });
  }
  if (buffer.length > maxBytes) {
    throw new OcrProviderError("Image is too large for OCR processing", {
      code: "OCR_IMAGE_TOO_LARGE",
      status: 413,
      metadata: { maxBytes },
    });
  }
};

const tesseractProvider = async ({ buffer, mimeType = "", fileName = "" }) => {
  ensureImageSafeguards({ buffer });

  let tesseract;
  try {
    tesseract = await import("tesseract.js");
  } catch {
    throw new OcrProviderError("Tesseract OCR provider is not installed on this server", {
      code: "OCR_TESSERACT_NOT_INSTALLED",
      status: 503,
    });
  }

  const timeoutMs = Number(process.env.OCR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const worker = await tesseract.createWorker("eng");
  try {
    const result = await withTimeout(worker.recognize(buffer), timeoutMs);
    return {
      text: result.data?.text || "",
      confidence: result.data?.confidence ?? null,
      metadata: {
        ocrEngine: "tesseract.js",
        provider: "tesseract",
        fileName,
        mimeType,
        timeoutMs,
      },
    };
  } finally {
    await worker.terminate().catch(() => null);
  }
};

const managedProvider = async () => {
  throw new OcrProviderError("Managed OCR provider interface is present but not configured", {
    code: "OCR_MANAGED_NOT_CONFIGURED",
    status: 503,
  });
};

let testProvider = null;

export const setOcrProviderForTests = (provider) => {
  testProvider = provider;
};

export const extractTextWithOcrProvider = async ({ buffer, mimeType = "", fileName = "" }) => {
  const provider = getOcrProviderName();
  const startedAt = Date.now();

  logger.info("ocr_provider_started", {
    provider,
    mimeType,
    fileName,
    imageBytes: buffer?.length || 0,
  });

  if (provider === "none") {
    throw new OcrProviderError("OCR is not configured on this server", {
      code: "OCR_NOT_CONFIGURED",
      status: 503,
    });
  }

  const result = testProvider
    ? await testProvider({ buffer, mimeType, fileName, provider })
    : provider === "tesseract"
      ? await tesseractProvider({ buffer, mimeType, fileName })
      : await managedProvider({ buffer, mimeType, fileName });

  logger.info("ocr_provider_completed", {
    provider,
    mimeType,
    fileName,
    latencyMs: Date.now() - startedAt,
    textLength: String(result.text || "").length,
    confidence: result.confidence ?? null,
  });

  return result;
};
