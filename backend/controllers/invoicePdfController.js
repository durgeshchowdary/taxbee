import { generateInvoicePdf } from "../services/invoicePdfService.js";

export const downloadInvoicePdf = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const result = await generateInvoicePdf(invoiceId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};