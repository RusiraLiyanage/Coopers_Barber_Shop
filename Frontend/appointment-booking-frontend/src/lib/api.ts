const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  isActive: boolean;
}

export interface AppointmentRecord {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
}

type ApiErrorPayload = {
  message?: string | string[];
};

type AuthSessionRefreshHandler = (session: AuthSession) => void;

function buildHeaders(session?: AuthSession) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  if (session?.refreshToken) {
    headers["x-refresh-token"] = session.refreshToken;
  }

  return headers;
}

function getRefreshedAuthSession(response: Response): AuthSession | null {
  const accessToken = response.headers.get("x-access-token");
  const refreshToken = response.headers.get("x-refresh-token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  onAuthSessionRefresh?: AuthSessionRefreshHandler,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });
  const refreshedSession = getRefreshedAuthSession(response);

  if (refreshedSession) {
    onAuthSessionRefresh?.(refreshedSession);
  }

  const rawBody = await response.text();
  const data = rawBody ? (JSON.parse(rawBody) as T | ApiErrorPayload) : null;

  if (!response.ok) {
    const errorMessage = (data as ApiErrorPayload | null)?.message;
    const message = Array.isArray(errorMessage)
      ? errorMessage.join(", ")
      : errorMessage || response.statusText;

    throw new Error(message || "Request failed");
  }

  return data as T;
}

export function toAuthSession(response: AuthResponse): AuthSession {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  };
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });
}

export function logout(session: AuthSession) {
  return request<{ success: boolean }>("/auth/logout", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
}

export function getServices() {
  return request<ServiceOption[]>("/services", {
    headers: buildHeaders(),
  });
}

export function getAvailability(
  session: AuthSession,
  serviceId: string,
  date: string,
  onAuthSessionRefresh?: AuthSessionRefreshHandler,
) {
  const query = new URLSearchParams({ serviceId, date });

  return request<string[]>(
    `/appointments/availability?${query.toString()}`,
    {
      headers: buildHeaders(session),
    },
    onAuthSessionRefresh,
  );
}

export function createAppointment(
  session: AuthSession,
  payload: { serviceId: string; date: string; slot: string },
  onAuthSessionRefresh?: AuthSessionRefreshHandler,
) {
  return request<AppointmentRecord>(
    "/appointments",
    {
      method: "POST",
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    },
    onAuthSessionRefresh,
  );
}

export function getAppointments(
  session: AuthSession,
  onAuthSessionRefresh?: AuthSessionRefreshHandler,
) {
  return request<AppointmentRecord[]>(
    "/appointments/all",
    {
      headers: buildHeaders(session),
    },
    onAuthSessionRefresh,
  );
}
