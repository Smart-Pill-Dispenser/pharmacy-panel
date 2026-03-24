import { pharmacyGet, pharmacyPatch, pharmacyPost } from "./client";
import type { ListResponse, LoginResponse, MeResponse, RefreshResponse } from "./types";

// The backend responses are envelopes; we keep client-side typing flexible.
export const pharmacyApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return pharmacyPost<LoginResponse>("pharmacy/login", { email, password }, true);
  },

  async refresh(email: string, refreshToken: string): Promise<RefreshResponse> {
    return pharmacyPost<RefreshResponse>("pharmacy/refresh", { email, refreshToken }, true);
  },

  async me(): Promise<MeResponse> {
    return pharmacyGet<MeResponse>("pharmacy/me");
  },

  async getDashboard(): Promise<any> {
    // Backend currently ignores period; keep simple for UI stability.
    return pharmacyGet<any>("pharmacy/dashboard");
  },

  async getDevices(params?: { limit?: number; q?: string; status?: string }): Promise<ListResponse<any>> {
    // Backend reads `q` and `status`; cursor/limit may be ignored in current implementation.
    return pharmacyGet<ListResponse<any>>("pharmacy/devices", {
      limit: params?.limit,
      q: params?.q,
      status: params?.status,
      // cursor is intentionally omitted (UI currently uses page slicing)
    });
  },

  async getDevice(deviceId: string): Promise<{ item: any }> {
    return pharmacyGet<{ item: any }>(`pharmacy/devices/${encodeURIComponent(deviceId)}`);
  },

  async getDeviceLogs(
    deviceId: string,
    params?: { limit?: number; cursor?: string; from?: string; to?: string }
  ): Promise<ListResponse<any>> {
    return pharmacyGet<ListResponse<any>>(`pharmacy/devices/${encodeURIComponent(deviceId)}/logs`, {
      limit: params?.limit,
      cursor: params?.cursor,
      from: params?.from,
      to: params?.to,
    });
  },

  async getUnassignedDevices(): Promise<ListResponse<{ id: string; serialNumber: string }>> {
    return pharmacyGet<ListResponse<{ id: string; serialNumber: string }>>("pharmacy/devices/unassigned");
  },

  async assignDeviceToPatient(deviceId: string, args: { patientId: string; patientName?: string }): Promise<any> {
    return pharmacyPost<any>(`pharmacy/devices/${encodeURIComponent(deviceId)}/assign`, args);
  },

  async stopDispensing(deviceId: string): Promise<any> {
    return pharmacyPost<any>(`pharmacy/devices/${encodeURIComponent(deviceId)}/commands/stop`, {}, false);
  },

  async resumeDispensing(deviceId: string): Promise<any> {
    return pharmacyPost<any>(`pharmacy/devices/${encodeURIComponent(deviceId)}/commands/resume`, {}, false);
  },

  async listCaregivers(params?: { limit?: number; q?: string; status?: string }): Promise<ListResponse<any>> {
    return pharmacyGet<ListResponse<any>>("pharmacy/caregivers", {
      limit: params?.limit,
      q: params?.q,
      status: params?.status,
    });
  },

  async getCaregiver(id: string): Promise<{ item: any }> {
    return pharmacyGet<{ item: any }>(`pharmacy/caregivers/${encodeURIComponent(id)}`);
  },

  async updateCaregiverStatus(id: string, args: { isActive: boolean }): Promise<any> {
    return pharmacyPatch<any>(`pharmacy/caregivers/${encodeURIComponent(id)}/status`, args);
  },

  async listHelpRequests(params?: {
    limit?: number;
    q?: string;
    status?: string;
    deviceId?: string;
    from?: string;
    to?: string;
  }): Promise<ListResponse<any>> {
    return pharmacyGet<ListResponse<any>>("pharmacy/help-requests", {
      limit: params?.limit,
      q: params?.q,
      status: params?.status,
      deviceId: params?.deviceId,
      from: params?.from,
      to: params?.to,
    });
  },

  async resolveHelpRequest(id: string, args?: { resolutionReason?: string }): Promise<any> {
    return pharmacyPatch<any>(`pharmacy/help-requests/${encodeURIComponent(id)}/resolve`, args ?? {});
  },

  async listLogs(params?: {
    limit?: number;
    q?: string;
    type?: string;
    deviceId?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }): Promise<ListResponse<any>> {
    return pharmacyGet<ListResponse<any>>("pharmacy/logs", {
      limit: params?.limit,
      q: params?.q,
      type: params?.type,
      deviceId: params?.deviceId,
      from: params?.from,
      to: params?.to,
      cursor: params?.cursor,
    });
  },

  async listPatients(params?: { limit?: number; cursor?: string; q?: string }): Promise<ListResponse<any>> {
    return pharmacyGet<ListResponse<any>>("pharmacy/patients", {
      limit: params?.limit,
      cursor: params?.cursor,
      q: params?.q,
    });
  },

  async getPatient(id: string): Promise<{ item: any }> {
    return pharmacyGet<{ item: any }>(`pharmacy/patients/${encodeURIComponent(id)}`);
  },

  async createPatient(body: any): Promise<any> {
    return pharmacyPost<any>("pharmacy/patients", body);
  },
};

