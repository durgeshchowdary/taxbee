type ApiFetchOptions = RequestInit & {
  attachLegacyBearer?: boolean;
  clearAuthOnFailure?: boolean;
};

const isBrowser = () => typeof window !== "undefined";
let clearingAuthCookie: Promise<void> | null = null;

export const getLegacyAuthToken = () => {
  if (!isBrowser()) return "";

  try {
    return window.localStorage.getItem("token") || "";
  } catch {
    return "";
  }
};

export const clearLegacyAuthToken = () => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem("token");
  } catch {
    // HttpOnly cookie auth remains authoritative.
  }
};

export const authHeaders = (options: { attachLegacyBearer?: boolean } = {}) => {
  if (!options.attachLegacyBearer) return {};

  const token = getLegacyAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestPath = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.pathname;
  return input.url;
};

const shouldSkipAuthCleanup = (input: RequestInfo | URL) => {
  const path = requestPath(input);
  return path.includes("/api/auth/login") || path.includes("/api/auth/logout");
};

const isAuthFailureResponse = async (res: Response) => {
  if (res.status !== 401 && res.status !== 403) return false;

  try {
    const body = await res.clone().json();
    const code = body?.code || body?.data?.code;
    return ["AUTH_INVALID", "AUTH_REQUIRED", "EMAIL_VERIFICATION_REQUIRED"].includes(code);
  } catch {
    return res.status === 401;
  }
};

export const clearServerAuthCookie = async () => {
  if (!isBrowser()) return;
  clearLegacyAuthToken();

  if (!clearingAuthCookie) {
    clearingAuthCookie = fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    })
      .catch(() => null)
      .then(() => undefined)
      .finally(() => {
        clearingAuthCookie = null;
      });
  }

  await clearingAuthCookie;
};

export const apiFetch = async (input: RequestInfo | URL, options: ApiFetchOptions = {}) => {
  const {
    attachLegacyBearer = false,
    clearAuthOnFailure = true,
    headers,
    ...init
  } = options;
  const nextHeaders = new Headers(headers);

  Object.entries(authHeaders({ attachLegacyBearer })).forEach(([key, value]) => {
    if (!nextHeaders.has(key)) {
      nextHeaders.set(key, value);
    }
  });

  const res = await fetch(input, {
    ...init,
    credentials: init.credentials || "same-origin",
    headers: nextHeaders,
  });

  if (clearAuthOnFailure && !shouldSkipAuthCleanup(input) && await isAuthFailureResponse(res)) {
    await clearServerAuthCookie();
  }

  return res;
};

export const logoutClientSession = async () => {
  await clearServerAuthCookie();
};
