import { extractTextWithOcrProvider, OcrProviderError } from "./ocrProviderService.js";

export const isImageMimeType = (mimeType = "", fileName = "") =>
  mimeType.startsWith("image/") || /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(fileName);

export const extractImageText = async ({ buffer, mimeType = "", fileName = "" }) => {
  try {
    const result = await extractTextWithOcrProvider({ buffer, mimeType, fileName });
    return {
      text: result.text || "",
      metadata: {
        extractor: "imageOcrExtractor",
        ocrEngine: result.metadata?.ocrEngine || result.metadata?.provider || "unknown",
        provider: result.metadata?.provider || "unknown",
        fileName,
        mimeType,
        confidence: result.confidence ?? null,
      },
      warnings: [],
    };
  } catch (error) {
    const known = error instanceof OcrProviderError;
    return {
      text: "",
      metadata: {
        extractor: "imageOcrExtractor",
        ocrEngine: known ? error.metadata?.provider || "not_configured" : "failed",
        fileName,
        mimeType,
        code: known ? error.code : "OCR_FAILED",
        status: known ? error.status : 422,
      },
      warnings: [known ? error.message : "OCR failed while processing this image."],
    };
  }
};
