import {
  createCheckoutOrder,
  verifyRazorpayPayment,
} from "../services/paymentService.js";

const getUserId = (req) => req.user?._id || req.user?.id;

export const createCheckout = async (req, res, next) => {
  try {
    const result = await createCheckoutOrder({
      userId: getUserId(req),
      planCode: req.body.planCode || "pro_monthly",
    });

    return res.status(201).json({
      success: true,
      message: "Checkout order created",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const result = await verifyRazorpayPayment({
      userId: getUserId(req),
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
    });

    return res.json({
      success: true,
      message: "Payment verified and subscription activated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};