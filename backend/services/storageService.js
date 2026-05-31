import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const env = (key, fallback = "") => process.env[key] || fallback;

const getRegion = () => env("AWS_REGION", "ap-south-1");
const getBucket = () => env("AWS_S3_BUCKET");
const getPrefix = () => env("AWS_S3_UPLOAD_PREFIX", "taxbee-imports");

let cachedClient = null;

export const getStorageProvider = () =>
  env("STORAGE_PROVIDER", "mongo").toLowerCase();

export const shouldUseS3Storage = () => getStorageProvider() === "s3";

export const getS3Client = () => {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: getRegion(),
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  return cachedClient;
};

const sanitizeSegment = (value = "") =>
  String(value)
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

export const buildStorageKey = ({ userId, importedDocumentId, fileName }) => {
  const safeUser = sanitizeSegment(userId);
  const safeDoc = sanitizeSegment(importedDocumentId || crypto.randomUUID());
  const safeFile = sanitizeSegment(fileName || "document");
  const prefix = sanitizeSegment(getPrefix());

  return `${prefix}/${safeUser}/${safeDoc}/${Date.now()}-${safeFile}`;
};

export const assertS3Configured = () => {
  if (!getBucket()) {
    const error = new Error("AWS_S3_BUCKET is required when STORAGE_PROVIDER=s3");
    error.status = 500;
    error.code = "S3_BUCKET_MISSING";
    throw error;
  }
};

export const base64ToBuffer = (fileBase64 = "") => {
  const cleaned = String(fileBase64).includes(",")
    ? String(fileBase64).split(",").pop()
    : String(fileBase64);

  return Buffer.from(cleaned || "", "base64");
};

export const uploadBufferToS3 = async ({
  userId,
  importedDocumentId,
  fileName,
  mimeType = "application/octet-stream",
  buffer,
}) => {
  assertS3Configured();

  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error("Cannot upload empty file buffer to S3");
    error.status = 400;
    error.code = "EMPTY_UPLOAD_BUFFER";
    throw error;
  }

  const bucket = getBucket();
  const region = getRegion();
  const key = buildStorageKey({ userId, importedDocumentId, fileName });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType || "application/octet-stream",
    ServerSideEncryption: "AES256",
    Metadata: {
      userId: String(userId || ""),
      importedDocumentId: String(importedDocumentId || ""),
      originalFileName: String(fileName || "").slice(0, 200),
    },
  });

  const result = await getS3Client().send(command);

  return {
    provider: "s3",
    bucket,
    key,
    region,
    contentType: mimeType || "application/octet-stream",
    etag: result.ETag || "",
    sizeBytes: buffer.length,
    uploadedAt: new Date(),
  };
};

export const downloadBufferFromS3 = async ({ storageRef }) => {
  assertS3Configured();

  if (!storageRef?.key) {
    const error = new Error("storageRef.key is required to download from S3");
    error.status = 400;
    error.code = "S3_KEY_MISSING";
    throw error;
  }

  const command = new GetObjectCommand({
    Bucket: storageRef.bucket || getBucket(),
    Key: storageRef.key,
  });

  const response = await getS3Client().send(command);
  const chunks = [];

  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
};

export const deleteFromS3 = async ({ storageRef }) => {
  assertS3Configured();

  if (!storageRef?.key) return null;

  const command = new DeleteObjectCommand({
    Bucket: storageRef.bucket || getBucket(),
    Key: storageRef.key,
  });

  return getS3Client().send(command);
};

export const generateSignedDownloadUrl = async ({
  storageRef,
  expiresIn = 900,
}) => {
  assertS3Configured();

  if (!storageRef?.key) {
    const error = new Error("storageRef.key is required for signed URL");
    error.status = 400;
    error.code = "S3_KEY_MISSING";
    throw error;
  }

  const command = new GetObjectCommand({
    Bucket: storageRef.bucket || getBucket(),
    Key: storageRef.key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
};

export const normalizeStorageRef = (storage = {}) => {
  if (!storage?.key) return null;

  return {
    bucket: storage.bucket || getBucket(),
    key: storage.key,
    region: storage.region || getRegion(),
    contentType: storage.contentType || "",
    etag: storage.etag || "",
    uploadedAt: storage.uploadedAt || new Date(),
  };
};