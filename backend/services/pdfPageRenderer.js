import { logger } from "../utils/safeLogger.js";

const DEFAULT_MAX_PDF_PAGES = 25;
const DEFAULT_RENDER_SCALE = 1.7;

export class PdfPageRenderError extends Error {
  constructor(message, { code = "PDF_PAGE_RENDER_FAILED", status = 422, metadata = {} } = {}) {
    super(message);
    this.name = "PdfPageRenderError";
    this.code = code;
    this.status = status;
    this.metadata = metadata;
  }
}

let testRenderer = null;

export const setPdfPageRendererForTests = (renderer) => {
  testRenderer = renderer;
};

export const getPdfPageRenderLimit = () =>
  Math.max(1, Number(process.env.OCR_MAX_PDF_PAGES || DEFAULT_MAX_PDF_PAGES));

const renderWithPdfJs = async ({ buffer, fileName = "" }) => {
  let canvasModule;
  try {
    canvasModule = await import("@napi-rs/canvas");
  } catch {
    throw new PdfPageRenderError("PDF page rendering dependency is not available on this server", {
      code: "PDF_RENDERER_NOT_CONFIGURED",
      status: 503,
    });
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const maxPages = getPdfPageRenderLimit();
  const pagesToRender = Math.min(pageCount, maxPages);
  const scale = Math.max(0.5, Math.min(3, Number(process.env.OCR_PDF_RENDER_SCALE || DEFAULT_RENDER_SCALE)));
  const images = [];

  try {
    for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      const canvas = canvasModule.createCanvas(width, height);
      const context = canvas.getContext("2d");

      context.fillStyle = "white";
      context.fillRect(0, 0, width, height);

      await page.render({ canvasContext: context, viewport }).promise;

      images.push({
        pageNumber,
        buffer: await canvas.encode("png"),
        mimeType: "image/png",
        fileName: `${fileName || "document.pdf"}#page-${pageNumber}.png`,
        width,
        height,
      });

      page.cleanup?.();
    }
  } finally {
    await pdf.destroy();
  }

  return {
    images,
    metadata: {
      renderer: "pdfPageRenderer",
      rendererEngine: "@napi-rs/canvas",
      fileName,
      pageCount,
      pagesRendered: images.length,
      pagesRequested: pagesToRender,
      truncated: pageCount > pagesToRender,
      scale,
    },
    warnings: pageCount > pagesToRender ? [`Only first ${pagesToRender} PDF pages were rendered for OCR.`] : [],
  };
};

export const renderPdfPagesToImages = async ({ buffer, fileName = "" }) => {
  const startedAt = Date.now();
  logger.info("pdf_page_render_started", {
    fileName,
    pdfBytes: buffer?.length || 0,
    maxPages: getPdfPageRenderLimit(),
  });

  try {
    const result = testRenderer
      ? await testRenderer({ buffer, fileName })
      : await renderWithPdfJs({ buffer, fileName });

    logger.info("pdf_page_render_completed", {
      fileName,
      pageCount: result.metadata?.pageCount,
      pagesRendered: result.images?.length || 0,
      latencyMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    logger.warn("pdf_page_render_failed", {
      fileName,
      code: error?.code || "PDF_PAGE_RENDER_FAILED",
      reason: error?.message || "PDF page rendering failed",
    });
    if (error instanceof PdfPageRenderError) throw error;
    throw new PdfPageRenderError("PDF page rendering failed before OCR could run", {
      code: "PDF_PAGE_RENDER_FAILED",
      status: 422,
    });
  }
};
