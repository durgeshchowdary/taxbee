import Invoice from "../models/Invoice.js";

export const buildReceiptEmail = ({
  invoiceNumber,
  planName,
  amountInPaise,
}) => {
  return {
    subject: `TaxBee Payment Receipt - ${invoiceNumber}`,
    html: `
      <h2>Payment Successful</h2>
      <p>Thank you for subscribing to TaxBee.</p>

      <ul>
        <li>Invoice: ${invoiceNumber}</li>
        <li>Plan: ${planName}</li>
        <li>Amount: ₹${(amountInPaise / 100).toFixed(2)}</li>
      </ul>
    `,
  };
};

export const generateReceiptFromInvoice = async (
  invoiceId
) => {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return buildReceiptEmail({
    invoiceNumber: invoice.invoiceNumber,
    planName: invoice.planCode,
    amountInPaise: invoice.amountInPaise,
  });
};