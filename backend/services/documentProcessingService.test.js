import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import ImportedDocument from "../models/ImportedDocument.js";
import AuditEvent from "../models/AuditEvent.js";
import { extractDocumentText, validateUpload } from "./documentProcessingService.js";
import { processUploadedDocument, markDocumentJobFailed } from "./documentJobService.js";
import { setOcrProviderForTests } from "./ocrProviderService.js";
import { getPdfPageRenderLimit, setPdfPageRendererForTests } from "./pdfPageRenderer.js";

const snapshotEnv = () => ({ ...process.env });
const restoreEnv = (snapshot) => {
  process.env = snapshot;
  setOcrProviderForTests(null);
  setPdfPageRendererForTests(null);
};

const pngBase64 = () =>
  Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    Buffer.from("fake image bytes"),
  ]).toString("base64");

const textPdfBase64 = () => {
  const pdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Gross salary 1000000) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000335 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
405
%%EOF`;
  return Buffer.from(pdf).toString("base64");
};

const scannedPdfBase64 = () => {
  const pdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Root 1 0 R /Size 4 >>
startxref
191
%%EOF`;
  return Buffer.from(pdf).toString("base64");
};

const withPatchedModels = async (patches, fn) => {
  const originals = [];
  for (const [model, method, replacement] of patches) {
    originals.push([model, method, model[method]]);
    model[method] = replacement;
  }
  try {
    return await fn();
  } finally {
    for (const [model, method, original] of originals.reverse()) {
      model[method] = original;
    }
  }
};

test("validateUpload rejects unsupported MIME and extension combinations", () => {
  const result = validateUpload({
    fileName: "payload.exe",
    mimeType: "application/x-msdownload",
    sizeBytes: 10,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 415);
});

test("validateUpload enforces upload size limits", () => {
  const result = validateUpload({
    fileName: "ais.pdf",
    mimeType: "application/pdf",
    sizeBytes: 7 * 1024 * 1024,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test("extractDocumentText rejects binary content with mismatched declared type", async () => {
  await assert.rejects(
    () =>
      extractDocumentText({
        fileName: "statement.pdf",
        mimeType: "application/pdf",
        fileBase64: Buffer.from("not a pdf").toString("base64"),
      }),
    /does not match/
  );
});

test("OCR_PROVIDER=none returns OCR_NOT_CONFIGURED for image OCR", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "none" };

  try {
    const result = await extractDocumentText({
      fileName: "receipt.png",
      mimeType: "image/png",
      fileBase64: pngBase64(),
    });

    assert.equal(result.text, "");
    assert.equal(result.extractionMetadata.ocrCode, "OCR_NOT_CONFIGURED");
    assert.equal(result.extractionMetadata.extractionMode, "ocr_failed");
  } finally {
    restoreEnv(env);
  }
});

test("text PDF still uses selectable PDF text path before OCR", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "none" };
  let rendered = false;
  setPdfPageRendererForTests(async () => {
    rendered = true;
    return { images: [], metadata: { pageCount: 0, pagesRendered: 0 }, warnings: [] };
  });

  try {
    const result = await extractDocumentText({
      fileName: "form16.pdf",
      mimeType: "application/pdf",
      fileBase64: textPdfBase64(),
    });

    assert.equal(result.extractionMetadata.extractionMode, "pdf_text");
    assert.match(result.text, /Gross salary 1000000/);
    assert.equal(rendered, false);
  } finally {
    restoreEnv(env);
  }
});

test("scanned PDF path calls pdfPageRenderer and OCR provider", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "tesseract", OCR_MAX_PDF_PAGES: "1" };
  let renderCalled = false;
  let ocrCalls = 0;
  setPdfPageRendererForTests(async () => {
    renderCalled = true;
    return {
      images: [
        {
          pageNumber: 1,
          buffer: Buffer.from("rendered page"),
          mimeType: "image/png",
          fileName: "scan.pdf#page-1.png",
        },
      ],
      metadata: {
        renderer: "test-renderer",
        rendererEngine: "test",
        pageCount: 3,
        pagesRendered: 1,
        truncated: true,
      },
      warnings: ["Only first 1 PDF pages were rendered for OCR."],
    };
  });
  setOcrProviderForTests(async () => {
    ocrCalls += 1;
    return {
      text: "Form 16 Gross salary 1000000",
      confidence: 89,
      metadata: { provider: "tesseract", ocrEngine: "test-ocr" },
    };
  });

  try {
    const result = await extractDocumentText({
      fileName: "scan.pdf",
      mimeType: "application/pdf",
      fileBase64: scannedPdfBase64(),
    });

    assert.equal(renderCalled, true);
    assert.equal(ocrCalls, 1);
    assert.equal(result.extractionMetadata.extractionMode, "ocr_pdf_pages");
    assert.equal(result.extractionMetadata.pagesRendered, 1);
    assert.equal(result.extractionMetadata.truncated, true);
    assert.match(result.text, /Gross salary/);
  } finally {
    restoreEnv(env);
  }
});

test("PDF page render limit respects OCR_MAX_PDF_PAGES", () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_MAX_PDF_PAGES: "2" };

  try {
    assert.equal(getPdfPageRenderLimit(), 2);
  } finally {
    restoreEnv(env);
  }
});

test("scanned PDF render failure returns clear OCR error metadata", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "tesseract" };
  setPdfPageRendererForTests(async () => {
    throw new Error("renderer failed");
  });

  try {
    const result = await extractDocumentText({
      fileName: "scan.pdf",
      mimeType: "application/pdf",
      fileBase64: scannedPdfBase64(),
    });

    assert.equal(result.text, "");
    assert.equal(result.extractionMetadata.extractionMode, "ocr_pdf_render_failed");
    assert.equal(result.extractionMetadata.ocrCode, "PDF_PAGE_RENDER_FAILED");
    assert.match(result.extractionWarnings.join(" "), /PDF page rendering failed/);
  } finally {
    restoreEnv(env);
  }
});

test("image OCR path calls provider abstraction", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "tesseract" };
  let called = false;
  setOcrProviderForTests(async () => {
    called = true;
    return {
      text: "Gross salary 1000000",
      confidence: 91,
      metadata: { provider: "tesseract", ocrEngine: "test-ocr" },
    };
  });

  try {
    const result = await extractDocumentText({
      fileName: "salary.png",
      mimeType: "image/png",
      fileBase64: pngBase64(),
    });

    assert.equal(called, true);
    assert.equal(result.extractionMetadata.extractionMode, "ocr_image");
    assert.match(result.text, /Gross salary/);
  } finally {
    restoreEnv(env);
  }
});

test("OCR success creates extracted fields requiring review without storing full raw text", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "tesseract" };
  setOcrProviderForTests(async () => ({
    text: "Form 16 Gross salary 1000000 TDS 25000",
    confidence: 88,
    metadata: { provider: "tesseract", ocrEngine: "test-ocr" },
  }));

  try {
    const createdDocs = [];
    await withPatchedModels(
      [
        [ImportedDocument, "create", async (payload) => {
          const doc = { _id: new mongoose.Types.ObjectId(), ...payload };
          createdDocs.push(doc);
          return doc;
        }],
        [AuditEvent, "create", async () => ({ _id: new mongoose.Types.ObjectId() })],
        [AuditEvent, "insertMany", async () => []],
      ],
      async () => {
        const doc = await processUploadedDocument({
          userId: String(new mongoose.Types.ObjectId()),
          upload: {
            fileName: "salary.png",
            mimeType: "image/png",
            fileBase64: pngBase64(),
          },
        });

        assert.equal(doc.extractedFields.some((field) => field.status === "extracted"), true);
        assert.equal(doc.sourceMetadata.extraction.extractionMode, "ocr_image");
        assert.equal(createdDocs[0].rawPreview, null);
        assert.ok(String(createdDocs[0].extractedTextPreview || "").length <= 4000);
      }
    );
  } finally {
    restoreEnv(env);
  }
});

test("successful scanned PDF OCR produces extracted fields requiring review", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "tesseract" };
  setPdfPageRendererForTests(async () => ({
    images: [{ pageNumber: 1, buffer: Buffer.from("rendered"), mimeType: "image/png", fileName: "scan.pdf#page-1.png" }],
    metadata: { renderer: "test-renderer", rendererEngine: "test", pageCount: 1, pagesRendered: 1, truncated: false },
    warnings: [],
  }));
  setOcrProviderForTests(async () => ({
    text: "Form 16 Gross salary 1000000 TDS 25000",
    confidence: 87,
    metadata: { provider: "tesseract", ocrEngine: "test-ocr" },
  }));

  try {
    const createdDocs = [];
    await withPatchedModels(
      [
        [ImportedDocument, "create", async (payload) => {
          const doc = { _id: new mongoose.Types.ObjectId(), ...payload };
          createdDocs.push(doc);
          return doc;
        }],
        [AuditEvent, "create", async () => ({ _id: new mongoose.Types.ObjectId() })],
        [AuditEvent, "insertMany", async () => []],
      ],
      async () => {
        const doc = await processUploadedDocument({
          userId: String(new mongoose.Types.ObjectId()),
          upload: {
            fileName: "scan.pdf",
            mimeType: "application/pdf",
            fileBase64: scannedPdfBase64(),
          },
        });

        assert.equal(doc.sourceMetadata.extraction.extractionMode, "ocr_pdf_pages");
        assert.equal(doc.sourceMetadata.extraction.pagesRendered, 1);
        assert.equal(doc.extractedFields.every((field) => field.status === "extracted"), true);
        assert.ok(String(createdDocs[0].extractedTextPreview || "").length <= 4000);
        assert.equal(createdDocs[0].rawPreview, null);
      }
    );
  } finally {
    restoreEnv(env);
  }
});

test("OCR failure records audit metadata and failed import state without raw OCR text", async () => {
  const env = snapshotEnv();
  process.env = { ...env, OCR_PROVIDER: "none" };
  const importId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const auditEvents = [];
  let failedUpdate = null;

  try {
    await withPatchedModels(
      [
        [AuditEvent, "create", async (payload) => {
          auditEvents.push(payload);
          return { _id: new mongoose.Types.ObjectId(), ...payload };
        }],
        [ImportedDocument, "findOneAndUpdate", async (_query, update) => {
          failedUpdate = update;
          return { _id: importId, ...update };
        }],
      ],
      async () => {
        let failure;
        try {
          await processUploadedDocument({
            userId: String(userId),
            importedDocumentId: String(importId),
            upload: {
              fileName: "receipt.png",
              mimeType: "image/png",
              fileBase64: pngBase64(),
            },
          });
        } catch (error) {
          failure = error;
        }

        assert.equal(failure?.code, "OCR_NOT_CONFIGURED");
        assert.equal(auditEvents.some((event) => event.eventType === "ocr_failed"), true);

        await markDocumentJobFailed({ importedDocumentId: String(importId), userId: String(userId), error: failure });
        assert.equal(failedUpdate.reviewStatus, "failed");
        assert.equal(failedUpdate.sourceMetadata.failureCode, "OCR_NOT_CONFIGURED");
        assert.equal(JSON.stringify(auditEvents).includes("Gross salary"), false);
      }
    );
  } finally {
    restoreEnv(env);
  }
});
