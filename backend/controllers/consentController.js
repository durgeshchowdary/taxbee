import Consent from "../models/Consent.js";
import { logger } from "../utils/safeLogger.js";

const getUserId = (req) => req.user?._id || req.user?.id;

export const acceptConsent = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { consentType, version = "v1" } = req.body;

    if (!consentType) {
      return res.status(400).json({
        success: false,
        message: "consentType is required",
      });
    }

    const consent = await Consent.findOneAndUpdate(
      { userId, consentType },
      {
        userId,
        consentType,
        status: "accepted",
        version,
        ipAddress: req.ip || "",
        userAgent: req.get("user-agent") || "",
        acceptedAt: new Date(),
        revokedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info("Consent accepted", {
      userId,
      consentType,
      version,
    });

    return res.json({
      success: true,
      message: "Consent accepted",
      data: consent,
    });
  } catch (error) {
    next(error);
  }
};

export const revokeConsent = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { consentType } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!consentType) {
      return res.status(400).json({
        success: false,
        message: "consentType is required",
      });
    }

    const consent = await Consent.findOneAndUpdate(
      { userId, consentType },
      {
        status: "revoked",
        revokedAt: new Date(),
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Consent revoked",
      data: consent,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyConsents = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const consents = await Consent.find({ userId }).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      data: consents,
    });
  } catch (error) {
    next(error);
  }
};