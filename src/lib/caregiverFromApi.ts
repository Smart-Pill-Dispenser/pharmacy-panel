import type { Caregiver } from "@/data/mockData";

/** Maps pharmacy (or admin) API caregiver JSON to panel `Caregiver` + metadata fields. */
export function caregiverFromApiRow(raw: Record<string, unknown>): Caregiver {
  const linked =
    Array.isArray(raw.linkedDevices) && raw.linkedDevices.length
      ? (raw.linkedDevices as string[])
      : Array.isArray(raw.linkedDeviceIds)
        ? (raw.linkedDeviceIds as string[]).map(String)
        : [];
  const statusRaw = String(raw.status ?? "").toLowerCase();
  const active =
    typeof raw.isActive === "boolean" ? raw.isActive : statusRaw !== "inactive";
  const email = String(raw.email ?? "").trim();
  const phone = String(raw.phone ?? "").trim();
  const org = raw.organizationId != null ? String(raw.organizationId).trim() : "";
  const createdAt = raw.createdAt != null ? String(raw.createdAt) : undefined;
  const updatedAt = raw.updatedAt != null ? String(raw.updatedAt) : undefined;

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: email || "—",
    phone,
    linkedDevices: linked,
    status: active ? "active" : "inactive",
    ...(org ? { organizationId: org } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function formatCaregiverDateTime(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
