import { apiUrl } from "./api-base";

export interface AuthUser {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  provider: string;
  supplier_id?: number | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = "qdia_auth_token";
const USER_KEY = "qdia_auth_user";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** En-têtes JSON + Authorization Bearer (routes IA/produits protégées). */
export function authJsonHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch {
    return null;
  }
}

export function persistAuth(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Serveur indisponible — vérifiez que l'API tourne (port 8080) et rafraîchissez la page.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body as T;
}

export const authApi = {
  register: (email: string, password: string, name?: string, role: "buyer" | "supplier" = "supplier") =>
    authFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    }),

  login: (email: string, password: string) =>
    authFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  google: (
    email: string,
    name: string,
    googleId?: string,
    idToken?: string,
    role: "buyer" | "supplier" = "supplier",
  ) =>
    authFetch<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({
        email,
        name,
        google_id: googleId,
        id_token: idToken,
        role,
      }),
    }),

  sendOtp: (phone: string) =>
    authFetch<{ sent: boolean; demo_code?: string }>("/api/auth/phone/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string, role: "buyer" | "supplier" = "supplier") =>
    authFetch<AuthResponse>("/api/auth/phone/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code, role }),
    }),

  me: () => authFetch<{ user: AuthUser }>("/api/auth/me"),
};

export interface PortInfo {
  code: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  handling_fee_dzd?: number;
  freight_to_fr_dzd?: number | null;
  freight_to_ae_dzd?: number | null;
}

export interface CustomsTariff {
  destination_country: string;
  destination_code: string;
  product_category: string;
  hs_code?: string;
  duty_rate_pct: number;
  vat_rate_pct: number;
  customs_fee_dzd: number;
  documentation_fee_dzd: number;
  notes?: string;
}

export interface CustomsCalcResult {
  destination_country: string;
  destination_code: string;
  duty_dzd: number;
  vat_dzd: number;
  customs_fee_dzd: number;
  documentation_fee_dzd: number;
  total_customs_dzd: number;
  notes?: string;
  hs_code?: string;
}

export const logisticsApi = {
  getPorts: () => authFetch<{ ports: PortInfo[]; grouped: { algeria: PortInfo[]; international: PortInfo[] } }>("/api/ports"),
  getCustoms: (destination?: string) =>
    authFetch<{ tariffs: CustomsTariff[] }>(`/api/customs${destination ? `?destination=${destination}` : ""}`),
  calculateCustoms: (body: {
    product_category: string;
    destination_code: string;
    cif_value_dzd: number;
    port_code?: string;
  }) =>
    authFetch<CustomsCalcResult>("/api/customs/calculate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
