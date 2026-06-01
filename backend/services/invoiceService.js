import Invoice from "../models/Invoice.js";

export const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  return `TB-${year}-${Date.now()}`;
};

export const createInvoice = async ({
  userId,
  subscriptionId,
  paymentId,
  planCode,
  amountInPaise,
}) => {
  const invoice = await Invoice.create({
    userId,
    subscriptionId,
    paymentId,
    invoiceNumber: generateInvoiceNumber(),
    planCode,
    amountInPaise,
    status: "paid",
  });

  return invoice;
};