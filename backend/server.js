import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import itrDraftRoutes from "./routes/itrDraftRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import taxContextRoutes from "./routes/taxContextRoutes.js";
import deductionRoutes from "./routes/deductionRoutes.js";
import taxSavingsRoutes from "./routes/taxSavingsRoutes.js";
import auditTimelineRoutes from "./routes/auditTimelineRoutes.js";
import collaborationRoutes from "./routes/collaborationRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { getAllowedOrigins, getMongoUri, validateEnv } from "./utils/env.js";
import { apiRateLimit, requestId, securityHeaders } from "./middleware/securityMiddleware.js";
import { sanitizeRequestInput } from "./middleware/validationMiddleware.js";
import { requestLogger } from "./middleware/observabilityMiddleware.js";
import { logger } from "./utils/safeLogger.js";
import { getHealth } from "./controllers/healthController.js";
import searchRoutes from "./routes/searchRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

mongoose.set("bufferCommands", false);
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestId);
app.use(securityHeaders);
app.use("/api/search", searchRoutes);

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
app.use("/api", apiRateLimit);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TaxBee backend is running",
    data: {
      service: "taxbee-backend",
    },
  });
});

app.get("/health", getHealth);

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
app.use("/api", healthRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnv();
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
