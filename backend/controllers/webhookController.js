import {
  verifyWebhookSignature,
  processWebhookEvent,
} from "../services/razorpayWebhookService.js";

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Razorpay webhook secret is not configured",
      });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isValid = verifyWebhookSignature({
      payload: rawBody,
      signature,
      secret,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const result = await processWebhookEvent({
      eventId: req.body?.id,
      eventType: req.body?.event,
      payload: req.body,
    });

    return res.status(200).json({
      success: true,
      duplicate: Boolean(result.duplicate),
    });
  } catch (error) {
    next(error);
  }
};