import { getPharmacyApiUrl } from "./config";
import type { ApiErrorBody } from "./types";

const USER_EMAIL_KEY = "pharmacy_user_email";
/** JWT sent as `Authorization: Bearer` for pharmacy API — must be ID token so claims include `custom:pharmacyId` (access tokens omit custom attrs). */
const ACCESS_KEY = "pharmacy_access_token";
const REFRESH_KEY = "pharmacy_refresh_token";
/** Cognito pool username for SECRET_HASH on refresh (`cognito:username` from ID token; may differ from email). */
const COGNITO_USERNAME_KEY = "pharmacy_cognito_username";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return JSON.parse(atob(b64 + pad)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Pool username claim — use for refresh SECRET_HASH when app client has a secret. */
export function cognitoUsernameFromIdToken(idToken: string | undefined | null): string | null {
  if (!idToken?.trim()) return null;
  const payload = decodeJwtPayload(idToken.trim());
  const u = payload?.["cognito:username"];
  return typeof u === "string" && u.trim() ? u.trim() : null;
}

function getStoredCognitoUsername(): string | null {
  try {
    const v = localStorage.getItem(COGNITO_USERNAME_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

/** Fired when refresh fails or session is invalid; Auth layer should logout + redirect. */
export const PHARMACY_SESSION_EXPIRED_EVENT = "pharmacy:session-expired";

function notifySessionExpired(): void {
  try {
    pharmacyTokenStorage.clear();
    window.dispatchEvent(new CustomEvent(PHARMACY_SESSION_EXPIRED_EVENT));
  } catch {
    /* ignore */
  }
}

export class PharmacyApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "PharmacyApiError";
  }
}

function getStoredEmail(): string | null {
  try {
    const email = localStorage.getItem(USER_EMAIL_KEY);
    if (!email) return null;
    const v = email.trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

function getAccessToken(): string | null {
  try {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) return null;
    const v = token.trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  try {
    const token = localStorage.getItem(REFRESH_KEY);
    if (!token) return null;
    const v = token.trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

async function parseErrorResponse(res: Response): Promise<ApiErrorBody> {
  const text = await res.text();
  try {
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return { code: "UNKNOWN", message: text || res.statusText || "Request failed" };
  }
}

function storeAccessToken(token: string): void {
  try {
    localStorage.setItem(ACCESS_KEY, token);
  } catch {
    // ignore
  }
}

async function tryRefreshSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  const email = getStoredEmail();
  if (!refreshToken || !email) return null;

  const poolUsername = getStoredCognitoUsername();
  const url = getPharmacyApiUrl("pharmacy/refresh");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      refreshToken,
      ...(poolUsername ? { username: poolUsername } : {}),
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { accessToken?: string; idToken?: string };
  // ID token carries `custom:pharmacyId` for Lambdas; access token does not.
  const bearer = data.idToken?.trim() || data.accessToken?.trim() || null;
  if (bearer) storeAccessToken(bearer);
  const newPoolUser = cognitoUsernameFromIdToken(data.idToken);
  if (newPoolUser) {
    try {
      localStorage.setItem(COGNITO_USERNAME_KEY, newPoolUser);
    } catch {
      /* ignore */
    }
  }
  return bearer;
}

export type PharmacyFetchOptions = RequestInit & {
  skipAuth?: boolean;
  /** Internal only: set after one token refresh so we never loop; not sent on the wire (avoids CORS on custom headers). */
  _pharmacyDidRefresh?: boolean;
};

export async function pharmacyFetch(path: string, options: PharmacyFetchOptions = {}): Promise<Response> {
  const { skipAuth, _pharmacyDidRefresh, ...init } = options;
  const url = getPharmacyApiUrl(path);
  const headers = new Headers(init.headers);
  const alreadyRetried = _pharmacyDidRefresh === true;

  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    // Access / ID JWT expired: gateways may return 401 or 403 ("The incoming token has expired").
    // Attempt one refresh + retry so long forms (e.g. Add patient) still succeed.
    let errorRes = res;
    if (!skipAuth && !alreadyRetried && (res.status === 401 || res.status === 403)) {
      const hadSession = !!(getAccessToken() || getRefreshToken());
      const newToken = await tryRefreshSession();
      if (newToken) {
        const retryHeaders = new Headers(headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        const retryRes = await pharmacyFetch(path, {
          ...init,
          skipAuth,
          _pharmacyDidRefresh: true,
          headers: retryHeaders,
        });
        if (retryRes.ok) return retryRes;
        errorRes = retryRes;
      } else if (hadSession) {
        notifySessionExpired();
      }
    }

    const body = await parseErrorResponse(errorRes);
    throw new PharmacyApiError(body.code || "ERROR", body.message || errorRes.statusText, errorRes.status, body.fieldErrors);
  }

  return res;
}

export async function pharmacyGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const search = params
    ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString()
    : "";
  const urlPath = path + (search ? `?${search}` : "");
  const res = await pharmacyFetch(urlPath, { method: "GET" });
  return (await res.json()) as T;
}

export async function pharmacyPost<T>(path: string, body?: unknown, skipAuth = false): Promise<T> {
  const res = await pharmacyFetch(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    skipAuth,
  });
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function pharmacyPatch<T>(path: string, body: unknown, skipAuth = false): Promise<T> {
  const res = await pharmacyFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    skipAuth,
  });
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function pharmacyDelete<T>(path: string, skipAuth = false): Promise<T> {
  const res = await pharmacyFetch(path, { method: "DELETE", skipAuth });
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const pharmacyTokenStorage = {
  getStoredEmail,
  storeAccessToken,
  /**
   * Persist Cognito tokens. `accessToken` field stores the JWT used as API Bearer (use ID token when available).
   */
  setTokens: (args: {
    email: string;
    accessToken: string;
    refreshToken?: string;
    /** From ID token `cognito:username` — improves refresh when pool username ≠ email. */
    cognitoUsername?: string | null;
  }) => {
    localStorage.setItem(USER_EMAIL_KEY, args.email);
    localStorage.setItem(ACCESS_KEY, args.accessToken);
    if (args.refreshToken) localStorage.setItem(REFRESH_KEY, args.refreshToken);
    if (args.cognitoUsername?.trim()) {
      localStorage.setItem(COGNITO_USERNAME_KEY, args.cognitoUsername.trim());
    } else {
      localStorage.removeItem(COGNITO_USERNAME_KEY);
    }
  },
  clear: () => {
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(COGNITO_USERNAME_KEY);
  },
};

