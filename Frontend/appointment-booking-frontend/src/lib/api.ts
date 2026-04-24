const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface AuthResponse {
  access_token: string;
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
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  staff: {
    id: string;
    displayName: string;
  };
}

type ApiErrorPayload = {
  message?: string | string[];
};

function buildHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
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

export function getServices() {
  return request<ServiceOption[]>("/services", {
    headers: buildHeaders(),
  });
}

export function getAvailability(token: string, serviceId: string, date: string) {
  const query = new URLSearchParams({ serviceId, date });

  return request<string[]>(`/appointments/availability?${query.toString()}`, {
    headers: buildHeaders(token),
  });
}

export function createAppointment(
  token: string,
  payload: { serviceId: string; date: string; slot: string },
) {
  return request<AppointmentRecord>("/appointments", {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function getAppointments(token: string) {
  return request<AppointmentRecord[]>("/appointments/all", {
    headers: buildHeaders(token),
  });
}
