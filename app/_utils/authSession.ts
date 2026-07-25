import { apiFetch, logoutClientSession } from "./authClient";

export type Portal = "taxpayer" | "reviewer" | "admin" | "verify-email";

export type SessionUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
};

export type SessionData = {
  user: SessionUser;
  role: string;
  isVerified: boolean;
  allowedPortals: Portal[];
  defaultPortal: Portal;
  requiresVerification: boolean;
};

let sessionCache: SessionData | null | undefined;
let sessionPromise: Promise<SessionData | null> | null = null;

export const portalPath = (portal: Portal) => {
  if (portal === "admin") return "/admin/dashboard";
  if (portal === "reviewer") return "/reviewer/workspaces";
  if (portal === "verify-email") return "/verify-email";
  return "/dashboard";
};

export const setSessionSnapshot = (session: SessionData | null) => {
  sessionCache = session;
  sessionPromise = null;
};

export const notifyAuthChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("taxbee:auth-changed"));
  }
};

export const loadSession = async (options: { force?: boolean } = {}): Promise<SessionData | null> => {
  if (!options.force && sessionCache !== undefined) return sessionCache;
  if (!options.force && sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const res = await apiFetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) {
      sessionCache = null;
      return null;
    }

    const body = await res.json().catch(() => ({}));
    sessionCache = body?.data || null;
    return sessionCache;
  })().finally(() => {
    sessionPromise = null;
  });

  return sessionPromise;
};

export const logoutSession = async () => {
  await logoutClientSession();
  setSessionSnapshot(null);
  notifyAuthChanged();
};
