/**
 * Pharmacy API base URL.
 * Must be provided via `VITE_PHARMACY_API_BASE_URL` in `.env`.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_PHARMACY_API_BASE_URL as string) ||
  "https://50aicw57c0.execute-api.us-east-1.amazonaws.com/staging";

export function getPharmacyApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

