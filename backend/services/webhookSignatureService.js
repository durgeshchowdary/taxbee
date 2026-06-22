import crypto from "crypto";

const ENCRYPTED_SECRET_PREFIX = "whsec:v1:";

const encryptionKey = () =>
  crypto
    .createHash("sha256")
    .update(String(process.env.WEBHOOK_SECRET_ENCRYPTION_KEY || process.env.JWT_SECRET || "dev"))
    .digest();

export const encryptWebhookSecret = (secret) => {
  if (!secret || String(secret).startsWith(ENCRYPTED_SECRET_PREFIX)) return secret;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(secret), "utf8"),
    cipher.final(),
  ]);

  return `${ENCRYPTED_SECRET_PREFIX}${iv.toString("base64url")}:${cipher
    .getAuthTag()
    .toString("base64url")}:${ciphertext.toString("base64url")}`;
};

export const decryptWebhookSecret = (secret) => {
  const value = String(secret || "");
  if (!value.startsWith(ENCRYPTED_SECRET_PREFIX)) return value;

  const [iv, tag, ciphertext] = value.slice(ENCRYPTED_SECRET_PREFIX.length).split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

export const isEncryptedWebhookSecret = (secret) =>
  String(secret || "").startsWith(ENCRYPTED_SECRET_PREFIX);

export const generateWebhookSignature = (
  payload,
  secret
) => {
  const body =
    typeof payload === "string"
      ? payload
      : JSON.stringify(payload);

  return crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
};

export const verifyWebhookSignature = (
  payload,
  secret,
  signature
) => {
  try {
    const expected =
      generateWebhookSignature(
        payload,
        secret
      );

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
};

export default {
  decryptWebhookSecret,
  encryptWebhookSecret,
  generateWebhookSignature,
  isEncryptedWebhookSecret,
  verifyWebhookSignature,
};
