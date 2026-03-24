export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
}

export interface LoginResponse {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface RefreshResponse {
  accessToken: string;
  idToken?: string;
  expiresIn?: number;
}

export interface MeResponse {
  email?: string;
  name?: string;
  role?: string;
  pharmacyId?: string;
  pharmacyName?: string;
  enabled?: boolean;
}

export interface ListResponse<TItem> {
  items: TItem[];
  count: number;
  cursor?: string;
}

export interface SingleItemResponse<TItem> {
  item: TItem;
}

export interface OkEnvelope {
  ok?: boolean;
  [key: string]: unknown;
}

