const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const AUTH_BROWSER_SESSION_KEY = "coopers_auth_browser_session";
const AUTH_REMEMBERED_SESSION_KEY = "coopers_auth_remembered_session";
const AUTH_HAD_SESSION_KEY = "coopers_auth_had_session";
export const AUTH_SESSION_REPLACED_SIGNAL_KEY =
  "coopers_auth_session_replaced";
export const SESSION_IDLE_EXPIRED_CODE = "SESSION_IDLE_EXPIRED";
export const SESSION_EXPIRED_CODE = "SESSION_EXPIRED";
export const ACTIVE_ACCOUNT_SESSION_EXISTS_CODE =
  "ACTIVE_ACCOUNT_SESSION_EXISTS";
export const SESSION_IDLE_EXPIRED_EVENT = "coopers-session-idle-expired";
export const SESSION_EXPIRED_EVENT = "coopers-session-expired";

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

export interface ConsultationQuestion {
  id: string;
  label: string;
  helperText?: string;
  required: boolean;
  answerType?: 'text' | 'single_choice' | 'multi_choice';
  options?: string[];
}

export interface ConsultationServiceSummary {
  id: string;
  name: string;
  complexity: 'low' | 'medium' | 'high';
  requiredSkills: string[];
  safetyTriggers: string[];
}

export interface ConsultationHairHistorySummary {
  service: string;
  hairState: string[];
  productsUsed: string | null;
  barberNotes: string | null;
  visitDate: string;
  monthsAgo: number;
  relevance: 'high' | 'medium' | 'low';
  safetyCritical: boolean;
}

export interface ConsultationStartResponse {
  service: ConsultationServiceSummary;
  questions: ConsultationQuestion[];
  previousHairHistory: ConsultationHairHistorySummary[];
}

export interface ConsultationSafetyNote {
  severity: 'low' | 'medium' | 'high';
  message: string;
  source: 'safety-rule' | 'service-trigger' | 'ai-observation';
}

export interface ConsultationBarberMatch {
  id: string;
  displayName: string;
  gender: 'male' | 'female' | 'non_binary' | 'unspecified';
  role: 'junior' | 'senior' | 'owner';
  rating: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface ConsultationSubmitResponse {
  service: ConsultationServiceSummary;
  matchedBarber: ConsultationBarberMatch;
  matchScore: number;
  matchReasons: string[];
  safetyNotes: ConsultationSafetyNote[];
  hairState: string[];
  desiredLook: string | null;
  consultationSummary: string;
  previousHairHistoryCount: number;
  generation: {
    source: 'claude' | 'fallback';
    model: string | null;
  };
}

export type ConsultationAnswerPayload = {
  questionId: string;
  answer: string;
};

export type ConsultationSubmitPayload = {
  serviceId: string;
  answers: ConsultationAnswerPayload[];
  hairPhoto?: HairPhotoPayload;
};

export type HairPhotoPayload = {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
};

export type ConsultationStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; name: string }
  | { type: 'tool_result'; name: string }
  | { type: 'result'; result: ConsultationSubmitResponse }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type SubmitConsultationStreamOptions = {
  onEvent?: (event: ConsultationStreamEvent) => void;
};

export type AppointmentAvailabilityRequest = {
  serviceId: string;
  date: string;
  staffId?: string;
  excludeAppointmentId?: string;
};

export type CreateAppointmentRequest = {
  serviceId: string;
  date: string;
  slot: string;
  staffId?: string;
  consultationSummary?: string;
  safetyNotes?: string;
  hairState?: string[];
  desiredLook?: string;
  goalPhoto?: HairPhotoPayload;
  consultationGenerationSource?: 'claude' | 'fallback';
  consultationGenerationModel?: string;
};

export type CreateAppointmentOptions = {
  idempotencyKey: string;
};

export type AppointmentMutationOptions = {
  idempotencyKey: string;
};

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

export type LoginOptions = {
  endExistingSessions?: boolean;
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

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");

  return `${normalizedBaseUrl}${normalizedPath}`;
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

export function clearCurrentClientTabAuthSession(): void {
  removeSessionStorageValue(AUTH_BROWSER_SESSION_KEY);
}

function broadcastClientSessionReplacement(): void {
  setLocalStorageValue(
    AUTH_SESSION_REPLACED_SIGNAL_KEY,
    `${Date.now()}:${Math.random()}`,
  );
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
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
    } else if (isSessionExpiredError(error)) {
      dispatchSessionExpiredEvent();
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

function dispatchSessionExpiredEvent(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function isSessionIdleExpiredError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.code === SESSION_IDLE_EXPIRED_CODE &&
    error.canExtend === true
  );
}

export function isSessionExpiredError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    (error.code === SESSION_EXPIRED_CODE ||
      (error.statusCode === 401 &&
        error.message === "Session expired. Please login again."))
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

export async function login(
  email: string,
  password: string,
  remember: boolean,
  options: LoginOptions = {},
) {
  const response = await request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      email,
      password,
      remember,
      endExistingSessions: options.endExistingSessions,
    }),
  });

  if (response.authenticated) {
    rememberClientAuthSession(remember);

    if (options.endExistingSessions === true) {
      broadcastClientSessionReplacement();
    }
  }

  return response;
}

export function beginGoogleOAuthLogin(): void {
  rememberClientAuthSession(true);
  window.location.assign(buildApiUrl("/auth/google"));
}

export interface GoogleLinkPrompt {
  email: string;
}

export interface GoogleSessionSwitchPrompt {
  email: string;
}

export function readGoogleLinkPrompt(): GoogleLinkPrompt | null {
  try {
    const params = new URLSearchParams(window.location.search);

    if (params.get("link_google") !== "1") {
      return null;
    }

    return { email: params.get("email")?.trim() ?? "" };
  } catch {
    return null;
  }
}

export function readGoogleSessionSwitchPrompt(): GoogleSessionSwitchPrompt | null {
  try {
    const params = new URLSearchParams(window.location.search);

    if (params.get("switch_google") !== "1") {
      return null;
    }

    return { email: params.get("email")?.trim() ?? "" };
  } catch {
    return null;
  }
}

export function clearGoogleLinkPromptFromUrl(): void {
  try {
    const url = new URL(window.location.href);

    url.searchParams.delete("link_google");
    url.searchParams.delete("switch_google");
    url.searchParams.delete("email");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  } catch {
    return;
  }
}

export async function linkGoogleAccount(
  password: string,
  options: LoginOptions = {},
) {
  const response = await request<AuthResponse>("/auth/google/link", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      password,
      endExistingSessions: options.endExistingSessions,
    }),
  });

  if (response.authenticated) {
    rememberClientAuthSession(true);

    if (options.endExistingSessions === true) {
      broadcastClientSessionReplacement();
    }
  }

  return response;
}

export async function completeGoogleSessionSwitch() {
  const response = await request<AuthResponse>("/auth/google/session-switch", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });

  if (response.authenticated) {
    rememberClientAuthSession(true);
    broadcastClientSessionReplacement();
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

export function logoutPreviousClientSession() {
  return request<{ success: boolean }>("/auth/logout", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  }).then((response) => {
    broadcastClientSessionReplacement();

    return response;
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

export function startConsultation(payload: { serviceId: string }) {
  return request<ConsultationStartResponse>("/consultation/start", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function submitConsultation(payload: ConsultationSubmitPayload) {
  return request<ConsultationSubmitResponse>("/consultation/submit", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function submitConsultationStream(
  payload: ConsultationSubmitPayload,
  options: SubmitConsultationStreamOptions = {},
): Promise<ConsultationSubmitResponse> {
  const response = await fetch(buildApiUrl("/consultation/submit/stream"), {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const data = await parseResponse<ConsultationSubmitResponse>(response);
    const errorMessage = getApiErrorMessage(data);
    const message = Array.isArray(errorMessage)
      ? errorMessage.join(", ")
      : errorMessage || response.statusText;
    const error = new ApiRequestError(
      message || "Request failed",
      response.status,
      getApiErrorCode(data),
      getApiErrorCanExtend(data),
    );

    if (isSessionIdleExpiredError(error)) {
      dispatchSessionIdleExpiredEvent();
    } else if (isSessionExpiredError(error)) {
      dispatchSessionExpiredEvent();
    }

    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ConsultationSubmitResponse | null = null;

  const emitEvent = (rawEvent: string) => {
    const dataLine = rawEvent
      .split("\n")
      .find((line) => line.startsWith("data:"));

    if (!dataLine) {
      return;
    }

    const rawData = dataLine.slice("data:".length).trim();

    if (!rawData) {
      return;
    }

    const event = JSON.parse(rawData) as ConsultationStreamEvent;

    if (event.type === "result") {
      finalResult = event.result;
    }

    if (event.type === "error") {
      throw new Error(event.message);
    }

    options.onEvent?.(event);
  };

  while (true) {
    const { value, done } = await reader.read();

    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      emitEvent(event);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    emitEvent(buffer);
  }

  if (!finalResult) {
    throw new Error("Consultation stream finished without a result");
  }

  return finalResult;
}

export function getAvailability({
  serviceId,
  date,
  staffId,
  excludeAppointmentId,
}: AppointmentAvailabilityRequest) {
  const query = new URLSearchParams({ serviceId, date });

  if (staffId) {
    query.set("staffId", staffId);
  }

  if (excludeAppointmentId) {
    query.set("excludeAppointmentId", excludeAppointmentId);
  }

  return request<string[]>(`/appointments/availability?${query.toString()}`, {
    headers: buildHeaders(),
  });
}

export function createAppointment(
  payload: CreateAppointmentRequest,
  options: CreateAppointmentOptions,
) {
  return request<AppointmentRecord>("/appointments", {
    method: "POST",
    headers: {
      ...buildHeaders(),
      "Idempotency-Key": options.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function updateAppointment(
  appointmentId: string,
  payload: { date: string; slot: string },
  options: AppointmentMutationOptions,
) {
  return request<AppointmentRecord>(`/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: {
      ...buildHeaders(),
      "Idempotency-Key": options.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function cancelAppointment(
  appointmentId: string,
  options: AppointmentMutationOptions,
) {
  return request<AppointmentRecord>(`/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: {
      ...buildHeaders(),
      "Idempotency-Key": options.idempotencyKey,
    },
  });
}

export function getAppointments() {
  return request<AppointmentRecord[]>("/appointments/all", {
    headers: buildHeaders(),
  });
}
