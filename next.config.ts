import type { NextConfig } from "next";

const buildConnectSrc = () => {
  const origins = new Set<string>(["'self'"]);

  for (const value of [process.env.BACKEND_URL, process.env.NEXT_PUBLIC_API_URL]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      origins.add(`${url.protocol}//${url.host}`);
    } catch {
      // Ignore invalid URLs in local env files.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:5000");
  }

  return Array.from(origins).join(" ");
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${buildConnectSrc()}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
