const DEFAULT_MAX_PDF_PAGES = 25;

export const isPdfMimeType = (mimeType = "", fileName = "") =>
  mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

export const extractPdfText = async ({ buffer, fileName = "" }) => {
  if (!buffer?.length) {
    return {
      text: "",
      metadata: { extractor: "pdfTextExtractor", pageCount: 0, textItemCount: 0 },
      warnings: ["PDF file was empty."],
    };
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
  const maxPdfPages = Number(process.env.OCR_MAX_PDF_PAGES || DEFAULT_MAX_PDF_PAGES);
  const pagesToRead = Math.min(pageCount, maxPdfPages);
  const textParts = [];
  let textItemCount = 0;

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    textItemCount += content.items.length;
    if (pageText.trim()) textParts.push(`Page ${pageNumber}\n${pageText}`);
  }

  await pdf.destroy();

  return {
    text: textParts.join("\n\n").trim(),
    metadata: {
      extractor: "pdfTextExtractor",
      fileName,
      pageCount,
      pagesRead: pagesToRead,
      textItemCount,
      truncated: pageCount > maxPdfPages,
    },
    warnings: pageCount > maxPdfPages ? [`Only first ${maxPdfPages} PDF pages were processed.`] : [],
  };
};
