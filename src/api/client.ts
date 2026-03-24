import { getPharmacyApiUrl } from "./config";
import type { ApiErrorBody } from "./types";

const USER_EMAIL_KEY = "pharmacy_user_email";
const ACCESS_KEY = "pharmacy_access_token";
const REFRESH_KEY = "pharmacy_refresh_token";

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

  const url = getPharmacyApiUrl("pharmacy/refresh");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, refreshToken }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { accessToken?: string; idToken?: string };
  const token = data.idToken ?? data.accessToken ?? null;
  if (token) storeAccessToken(token);
  return token;
}

export async function pharmacyFetch(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<Response> {
  const { skipAuth, ...init } = options;
  const url = getPharmacyApiUrl(path);
  const headers = new Headers(init.headers);
  const alreadyRetried = headers.get("X-Pharmacy-Retry") === "1";

  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    if (res.status === 401 && !skipAuth && !alreadyRetried) {
      const newToken = await tryRefreshSession();
      if (newToken) {
        const retryHeaders = new Headers(headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        retryHeaders.set("X-Pharmacy-Retry", "1");
        const retryRes = await fetch(url, { ...init, headers: retryHeaders });
        if (retryRes.ok) return retryRes;
      }
    }

    const body = await parseErrorResponse(res);
    throw new PharmacyApiError(body.code || "ERROR", body.message || res.statusText, res.status, body.fieldErrors);
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

export const pharmacyTokenStorage = {
  getStoredEmail,
  storeAccessToken,
  setTokens: (args: { email: string; accessToken: string; refreshToken?: string }) => {
    localStorage.setItem(USER_EMAIL_KEY, args.email);
    localStorage.setItem(ACCESS_KEY, args.accessToken);
    if (args.refreshToken) localStorage.setItem(REFRESH_KEY, args.refreshToken);
  },
  clear: () => {
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

