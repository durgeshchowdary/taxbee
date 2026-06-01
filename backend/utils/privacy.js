const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g;

export function maskPan(value = "") {
  return String(value).replace(PAN_REGEX, (pan) => {
    return `${pan.slice(0, 2)}***${pan.slice(5, 9)}*`;
  });
}

export function maskEmail(value = "") {
  return String(value).replace(EMAIL_REGEX, (email) => {
    const [name, domain] = email.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  });
}

export function maskPhone(value = "") {
  return String(value).replace(PHONE_REGEX, (phone) => {
    return `${phone.slice(0, 2)}******${phone.slice(-2)}`;
  });
}

export function maskSensitiveText(value = "") {
  return maskPhone(maskEmail(maskPan(String(value))));
}

export function sanitizeLogPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;

  return JSON.parse(
    JSON.stringify(payload, (key, value) => {
      const sensitiveKeys = [
        "password",
        "token",
        "jwt",
        "secret",
        "authorization",
        "pan",
        "aadhaar",
        "mobile",
        "phone",
        "email",
      ];

      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        return "[REDACTED]";
      }

      if (typeof value === "string") {
        return maskSensitiveText(value);
      }

      return value;
    })
  );
}