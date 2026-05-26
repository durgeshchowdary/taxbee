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

export const portalPath = (portal: Portal) => {
  if (portal === "admin") return "/admin/dashboard";
  if (portal === "reviewer") return "/reviewer/workspaces";
  if (portal === "verify-email") return "/verify-email";
  return "/dashboard";
};

export const loadSession = async (): Promise<SessionData | null> => {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return body?.data || null;
};

export const logoutSession = async () => {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
};
