import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import Invoice from "../models/Invoice.js";

export const generateInvoicePdf = async (
  invoiceId
) => {
  const invoice =
    await Invoice.findById(invoiceId).lean();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const invoicesDir = path.join(
    process.cwd(),
    "uploads",
    "invoices"
  );

  fs.mkdirSync(invoicesDir, {
    recursive: true,
  });

  const pdfPath = path.join(
    invoicesDir,
    `${invoice.invoiceNumber}.pdf`
  );

  const doc = new PDFDocument();

  const stream =
    fs.createWriteStream(pdfPath);

  doc.pipe(stream);

  doc.fontSize(24);
  doc.text("TaxBee Invoice");

  doc.moveDown();

  doc.fontSize(12);
  doc.text(
    `Invoice Number: ${invoice.invoiceNumber}`
  );

  doc.text(
    `Plan: ${invoice.planCode}`
  );

  doc.text(
    `Amount: ₹${(
      invoice.amountInPaise / 100
    ).toFixed(2)}`
  );

  doc.text(
    `Status: ${invoice.status}`
  );

  doc.text(
    `Created: ${new Date(
      invoice.createdAt
    ).toLocaleString()}`
  );

  doc.end();

  await new Promise((resolve) =>
    stream.on("finish", resolve)
  );

  return {
    success: true,
    invoiceNumber:
      invoice.invoiceNumber,
    pdfPath,
  };
};