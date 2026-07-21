import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import notificationPreferenceRoutes from "./routes/notificationPreferenceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import itrDraftRoutes from "./routes/itrDraftRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import invoicePdfRoutes from "./routes/invoicePdfRoutes.js";
import taxContextRoutes from "./routes/taxContextRoutes.js";
import documentLifecycleRoutes from "./routes/documentLifecycleRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import deductionRoutes from "./routes/deductionRoutes.js";
import taxSavingsRoutes from "./routes/taxSavingsRoutes.js";
import auditTimelineRoutes from "./routes/auditTimelineRoutes.js";
import collaborationRoutes from "./routes/collaborationRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import billingAnalyticsRoutes from "./routes/billingAnalyticsRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import consentRoutes from "./routes/consentRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import disclaimerRoutes from "./routes/disclaimerRoutes.js";
import reviewWorkflowRoutes from "./routes/reviewWorkflowRoutes.js";

import notificationCenterRoutes from "./routes/notificationCenterRoutes.js";
import monitoringRoutes from "./routes/monitoringRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import apiKeyRoutes from "./routes/apiKeyRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import featureFlagRoutes from "./routes/featureFlagRoutes.js";
import filingRoutes from "./routes/filingRoutes.js";
import eInvoiceRoutes from "./routes/eInvoiceRoutes.js";
import usageAnalyticsRoutes from "./routes/usageAnalyticsRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { getAllowedOrigins, getMongoUri, validateEnv } from "./utils/env.js";
import {
  apiRateLimit,
  requestId,
  securityHeaders,
} from "./middleware/securityMiddleware.js";
import { sanitizeRequestInput } from "./middleware/validationMiddleware.js";
import { requestLogger } from "./middleware/observabilityMiddleware.js";
import { logger } from "./utils/safeLogger.js";
import { getHealth } from "./controllers/healthController.js";
import { initSentry } from "./utils/sentry.js";
import webhookAnalyticsRoutes
from "./routes/webhookAnalyticsRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

validateEnv();
initSentry();

mongoose.set("bufferCommands", false);
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

const app = express();
const PORT = process.env.PORT || 5000;

logger.info("TaxBee backend config loaded", {
  nodeEnv: process.env.NODE_ENV || "development",
  appEnv: process.env.APP_ENV || process.env.NODE_ENV || "development",
  port: PORT,
  hasMongoUri: Boolean(process.env.MONGODB_URI || process.env.MONGO_URI),
  hasJwtSecret: Boolean(process.env.JWT_SECRET),
  corsOrigins: getAllowedOrigins(),
  hasRedisUrl: Boolean(process.env.REDIS_URL),
  hasSentryDsn: Boolean(process.env.SENTRY_DSN),
});


app.use(requestId);
app.use(securityHeaders);
app.use(
  "/api/notification-center",
  notificationCenterRoutes
);
app.use(
  "/api/webhook-analytics",
  webhookAnalyticsRoutes
);
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = getAllowedOrigins();

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    maxAge: 600,
  })
);

app.use(express.json({ limit: "9mb" }));
app.use(sanitizeRequestInput);
app.use(requestLogger);
app.use("/api/api-keys", apiKeyRoutes);
app.use("/api", apiRateLimit);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TaxBee backend is running",
    data: {
      service: "taxbee-backend",
      environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
    },
  });
});

app.get("/health", getHealth);

app.use("/api/notification-preferences", notificationPreferenceRoutes);
app.use("/api/documents", documentLifecycleRoutes);
app.use("/api/review-workflow", reviewWorkflowRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/billing-analytics", billingAnalyticsRoutes);
app.use("/api/invoices", invoicePdfRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/feature-flags", featureFlagRoutes);
app.use("/api/filings", filingRoutes);
app.use("/api/e-invoices", eInvoiceRoutes);
app.use("/api/usage-analytics", usageAnalyticsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin-dashboard", adminDashboardRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/itr-draft", itrDraftRoutes);
app.use("/api/tax-context", taxContextRoutes);
app.use("/api/deductions", deductionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/tax-savings", taxSavingsRoutes);
app.use("/api/audit-timeline", auditTimelineRoutes);
app.use("/api/collaboration", collaborationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/consents", consentRoutes);
app.use("/api/disclaimers", disclaimerRoutes);
app.use("/api", healthRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await mongoose.connect(getMongoUri(), {
      serverSelectionTimeoutMS: 10000,
    });

    logger.info("MongoDB connected");

    app.listen(PORT, () => {
      logger.info("Server running", { port: PORT });
    });
  } catch (err) {
    logger.error("Backend startup failed", err);
    process.exit(1);
  }
};

startServer();