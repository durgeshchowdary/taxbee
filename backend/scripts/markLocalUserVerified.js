import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "../models/user.js";
import { getMongoUri } from "../utils/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const email = String(process.argv[2] || "").trim().toLowerCase();

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to mark users verified in production");
}

if (!email || !email.includes("@")) {
  throw new Error("Usage: node scripts/markLocalUserVerified.js user@example.com");
}

await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 });

const user = await User.findOneAndUpdate(
  { email },
  { isVerified: true, $unset: { otpHash: "", otpExpiresAt: "", isEmailVerified: "", emailVerified: "" } },
  { new: true }
).select("email isVerified");

await mongoose.disconnect();

if (!user) {
  throw new Error(`No local user found for ${email}`);
}

console.log(`Marked ${user.email} verified: ${user.isVerified}`);
