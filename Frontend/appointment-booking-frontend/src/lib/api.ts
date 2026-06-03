const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export interface AuthResponse {
  authenticated: boolean;
}

export interface AuthSession {
  authenticated: true;
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

type ParsedResponse<T> = T | ApiErrorPayload | string | null;

function buildHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  const data = await parseResponse<T>(response);

  if (!response.ok) {
    const errorMessage = getApiErrorMessage(data);
    const message = Array.isArray(errorMessage)
      ? errorMessage.join(", ")
      : errorMessage || response.statusText;

    throw new Error(message || "Request failed");
  }

  return data as T;
}

async function parseResponse<T>(response: Response): Promise<ParsedResponse<T>> {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return rawBody;
  }

  try {
    return JSON.parse(rawBody) as T | ApiErrorPayload;
  } catch {
    return rawBody;
  }
}

function getApiErrorMessage<T>(
  data: ParsedResponse<T>,
): string | string[] | undefined {
  if (typeof data === "string") {
    return data;
  }

  if (typeof data !== "object" || data === null || !("message" in data)) {
    return undefined;
  }

  return data.message;
}

export function toAuthSession(response: AuthResponse): AuthSession {
  if (!response.authenticated) {
    throw new Error("Authentication failed");
  }

  return {
    authenticated: true,
  };
}

export function getCurrentSession() {
  return request<AuthResponse>("/auth/session", {
    headers: buildHeaders(),
  });
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

export function logout() {
  return request<{ success: boolean }>("/auth/logout", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export function getServices() {
  return request<ServiceOption[]>("/services", {
    headers: buildHeaders(),
  });
}

export function getAvailability(
  serviceId: string,
  date: string,
) {
  const query = new URLSearchParams({ serviceId, date });

  return request<string[]>(`/appointments/availability?${query.toString()}`, {
    headers: buildHeaders(),
  });
}

export function createAppointment(
  payload: { serviceId: string; date: string; slot: string },
) {
  return request<AppointmentRecord>("/appointments", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function getAppointments() {
  return request<AppointmentRecord[]>("/appointments/all", {
    headers: buildHeaders(),
  });
}
