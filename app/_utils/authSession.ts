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

let sessionCache: SessionData | null | undefined = undefined;
let sessionPromise: Promise<SessionData | null> | null = null;

export const portalPath = (portal: Portal) => {
  switch (portal) {
    case "admin":
      return "/admin/dashboard";
    case "reviewer":
      return "/reviewer/workspaces";
    case "verify-email":
      return "/verify-email";
    default:
      return "/dashboard";
  }
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

export const loadSession = async (
  options: { force?: boolean } = {}
): Promise<SessionData | null> => {
  if (!options.force && sessionCache !== undefined) {
    return sessionCache;
  }

  if (!options.force && sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async (): Promise<SessionData | null> => {
    const res = await apiFetch("/api/auth/session", {
      cache: "no-store",
    });

    if (!res.ok) {
      sessionCache = null;
      return null;
    }

    const body = (await res.json().catch(() => ({}))) as {
      data?: SessionData;
    };

    const session: SessionData | null = body.data ?? null;

    sessionCache = session;

    return session;
  })();

  sessionPromise.finally(() => {
    sessionPromise = null;
  });

  return sessionPromise;
};

export const logoutSession = async (): Promise<void> => {
  await logoutClientSession();
  setSessionSnapshot(null);
  notifyAuthChanged();
};