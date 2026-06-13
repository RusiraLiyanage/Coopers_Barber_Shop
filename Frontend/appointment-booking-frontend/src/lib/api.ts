const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const AUTH_BROWSER_SESSION_KEY = "coopers_auth_browser_session";
const AUTH_REMEMBERED_SESSION_KEY = "coopers_auth_remembered_session";
const AUTH_HAD_SESSION_KEY = "coopers_auth_had_session";
export const SESSION_IDLE_EXPIRED_CODE = "SESSION_IDLE_EXPIRED";
export const SESSION_IDLE_EXPIRED_EVENT = "coopers-session-idle-expired";

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

export interface AccountProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  suburb: string | null;
  role: string;
}

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  mobile: string;
  suburb: string;
  email: string;
  password: string;
  remember: boolean;
};

export type UpdateAccountPayload = {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  suburb: string;
};

export type PasswordResetRequestPayload = {
  email: string;
};

export type PasswordResetVerifyPayload = {
  email: string;
  code: string;
};

export type PasswordResetConfirmPayload = PasswordResetVerifyPayload & {
  password: string;
};

type ApiErrorPayload = {
  message?: string | string[];
  code?: string;
  canExtend?: boolean;
};

type ParsedResponse<T> = T | ApiErrorPayload | string | null;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly canExtend?: boolean,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function buildHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

function getSessionStorageValue(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function getLocalStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setSessionStorageValue(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    return;
  }
}

function setLocalStorageValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function removeSessionStorageValue(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

function removeLocalStorageValue(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

function rememberClientAuthSession(remember: boolean): void {
  setSessionStorageValue(AUTH_BROWSER_SESSION_KEY, "true");
  setLocalStorageValue(AUTH_HAD_SESSION_KEY, "true");

  if (remember) {
    setLocalStorageValue(AUTH_REMEMBERED_SESSION_KEY, "true");
    return;
  }

  removeLocalStorageValue(AUTH_REMEMBERED_SESSION_KEY);
}

function markRestoredClientAuthSession(): void {
  if (
    getSessionStorageValue(AUTH_BROWSER_SESSION_KEY) === "true" ||
    getLocalStorageValue(AUTH_REMEMBERED_SESSION_KEY) === "true"
  ) {
    setSessionStorageValue(AUTH_BROWSER_SESSION_KEY, "true");
  }
}

export function canRestoreClientAuthSession(): boolean {
  return (
    getSessionStorageValue(AUTH_BROWSER_SESSION_KEY) === "true" ||
    getLocalStorageValue(AUTH_REMEMBERED_SESSION_KEY) === "true"
  );
}

export function shouldClearStaleClientAuthSession(): boolean {
  return (
    !canRestoreClientAuthSession() &&
    getLocalStorageValue(AUTH_HAD_SESSION_KEY) === "true"
  );
}

export function clearClientAuthSession(): void {
  removeSessionStorageValue(AUTH_BROWSER_SESSION_KEY);
  removeLocalStorageValue(AUTH_REMEMBERED_SESSION_KEY);
  removeLocalStorageValue(AUTH_HAD_SESSION_KEY);
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
    const code = getApiErrorCode(data);
    const canExtend = getApiErrorCanExtend(data);
    const error = new ApiRequestError(
      message || "Request failed",
      response.status,
      code,
      canExtend,
    );

    if (isSessionIdleExpiredError(error)) {
      dispatchSessionIdleExpiredEvent();
    }

    throw error;
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

function getApiErrorCode<T>(data: ParsedResponse<T>): string | undefined {
  if (typeof data !== "object" || data === null || !("code" in data)) {
    return undefined;
  }

  return typeof data.code === "string" ? data.code : undefined;
}

function getApiErrorCanExtend<T>(data: ParsedResponse<T>): boolean | undefined {
  if (typeof data !== "object" || data === null || !("canExtend" in data)) {
    return undefined;
  }

  return typeof data.canExtend === "boolean" ? data.canExtend : undefined;
}

function dispatchSessionIdleExpiredEvent(): void {
  window.dispatchEvent(new Event(SESSION_IDLE_EXPIRED_EVENT));
}

export function isSessionIdleExpiredError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.code === SESSION_IDLE_EXPIRED_CODE &&
    error.canExtend === true
  );
}

export function toAuthSession(response: AuthResponse): AuthSession {
  if (!response.authenticated) {
    throw new Error("Authentication failed");
  }

  return {
    authenticated: true,
  };
}

export async function getCurrentSession() {
  const response = await request<AuthResponse>("/auth/session", {
    headers: buildHeaders(),
  });

  if (response.authenticated) {
    markRestoredClientAuthSession();
  }

  return response;
}

export async function refreshSession() {
  const response = await request<AuthResponse>("/auth/refresh", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });

  if (response.authenticated) {
    markRestoredClientAuthSession();
  }

  return response;
}

export async function extendSession() {
  const response = await request<AuthResponse>("/auth/extend", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });

  if (response.authenticated) {
    markRestoredClientAuthSession();
  }

  return response;
}

export async function login(email: string, password: string, remember: boolean) {
  const response = await request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password, remember }),
  });

  if (response.authenticated) {
    rememberClientAuthSession(remember);
  }

  return response;
}

export async function register(payload: RegisterPayload) {
  const response = await request<AuthResponse>("/auth/register", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.authenticated) {
    rememberClientAuthSession(payload.remember);
  }

  return response;
}

export function logout() {
  clearClientAuthSession();

  return request<{ success: boolean }>("/auth/logout", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export function getAccountProfile() {
  return request<AccountProfile>("/auth/me", {
    headers: buildHeaders(),
  });
}

export function updateAccountProfile(payload: UpdateAccountPayload) {
  return request<AccountProfile>("/auth/me", {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function requestPasswordReset(payload: PasswordResetRequestPayload) {
  return request<{ success: true }>("/auth/password-reset/request", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function verifyPasswordResetCode(payload: PasswordResetVerifyPayload) {
  return request<{ valid: true }>("/auth/password-reset/verify", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function confirmPasswordReset(payload: PasswordResetConfirmPayload) {
  clearClientAuthSession();

  return request<{ success: true }>("/auth/password-reset/confirm", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
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
  excludeAppointmentId?: string,
) {
  const query = new URLSearchParams({ serviceId, date });

  if (excludeAppointmentId) {
    query.set("excludeAppointmentId", excludeAppointmentId);
  }

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

export function updateAppointment(
  appointmentId: string,
  payload: { date: string; slot: string },
) {
  return request<AppointmentRecord>(`/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function cancelAppointment(appointmentId: string) {
  return request<AppointmentRecord>(`/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: buildHeaders(),
  });
}

export function getAppointments() {
  return request<AppointmentRecord[]>("/appointments/all", {
    headers: buildHeaders(),
  });
}
