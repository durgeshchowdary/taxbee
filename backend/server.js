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
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { getAllowedOrigins, validateEnv } from "./utils/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

mongoose.set("bufferCommands", false);

const app = express();

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
  })
);

app.use(express.json({ limit: "256kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TaxBee backend is running",
    data: {
      service: "taxbee-backend",
    },
  });
});

app.get("/health", (req, res) => {
  const readyState = mongoose.connection.readyState;

  res.status(readyState === 1 ? 200 : 503).json({
    success: readyState === 1,
    message: readyState === 1 ? "Service healthy" : "Service degraded",
    data: {
    status: readyState === 1 ? "ok" : "degraded",
    database: ["disconnected", "connected", "connecting", "disconnecting"][readyState],
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/itr-draft", itrDraftRoutes);
app.use("/api/ai", aiRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnv();
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

startServer();
