const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
export const SESSION_EXPIRED_CODE = 'SESSION_EXPIRED';
export const SESSION_IDLE_EXPIRED_CODE = 'SESSION_IDLE_EXPIRED';
export const SESSION_IDLE_EXPIRED_EVENT = 'coopers-admin-session-idle-expired';
export const SESSION_EXPIRED_EVENT = 'coopers-admin-session-expired';

export type StaffRole = 'junior' | 'senior' | 'owner';
export type ServiceComplexity = 'low' | 'medium' | 'high';
export type SafetyRuleSeverity = 'low' | 'medium' | 'high';
export type UserRole = 'customer' | 'admin';

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

export interface AuthResponse {
  authenticated: boolean;
}

export interface AccountProfileResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  suburb: string | null;
  role: UserRole;
}

export type AdminLoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

export interface BarberRecord {
  id: string;
  displayName: string;
  email: string | null;
  role: StaffRole;
  timezone: string;
  bufferAfterMinutes: number;
  skills: string[];
  rating: number;
  available: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAiConfigRecord {
  id: string;
  name: string;
  durationMinutes: number;
  isActive: boolean;
  requiredSkills: string[];
  safetyTriggers: string[];
  complexity: ServiceComplexity;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyRuleRecord {
  id: string;
  condition: string;
  serviceIds: string[];
  message: string;
  severity: SafetyRuleSeverity;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BriefBookingUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface BriefBookingService {
  id: string;
  name: string;
  durationMinutes: number;
}

export interface BriefBookingStaff {
  id: string;
  displayName: string;
}

export interface BriefBooking {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  customer: BriefBookingUser;
  service: BriefBookingService;
  staff: BriefBookingStaff;
}

export interface AppointmentBriefRecord {
  id: string;
  booking: BriefBooking;
  barber: BarberRecord | null;
  clientSummary: string;
  safetyNotes: string | null;
  hairState: string[];
  desiredLook: string | null;
  generatedAt: string;
}

export interface HairHistoryRecord {
  id: string;
  client: BriefBookingUser;
  barber: BarberRecord | null;
  service: string;
  hairState: string[];
  productsUsed: string | null;
  barberNotes: string | null;
  visitDate: string;
  createdAt: string;
}

export type CreateBarberPayload = {
  displayName: string;
  email?: string;
  role?: StaffRole;
  timezone?: string;
  skills?: string[];
  rating?: number;
  available?: boolean;
  active?: boolean;
};

export type UpdateBarberPayload = Partial<CreateBarberPayload>;

export type DeleteBarberResponse = {
  success: true;
};

export type UpdateServiceAiConfigPayload = {
  requiredSkills?: string[];
  safetyTriggers?: string[];
  complexity?: ServiceComplexity;
  isActive?: boolean;
};

export type CreateSafetyRulePayload = {
  condition: string;
  serviceIds: string[];
  message: string;
  severity?: SafetyRuleSeverity;
  active?: boolean;
};

export type UpdateSafetyRulePayload = Partial<CreateSafetyRulePayload>;

export type CreateAdminInvitePayload = {
  email: string;
  expiresInDays?: number;
};

export type AdminInviteResponse = {
  token: string;
  email: string;
  role: UserRole;
  expiresAt: string;
};

export type AcceptAdminInvitePayload = {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  suburb?: string;
};

export type AcceptAdminInviteResponse = {
  success: true;
  email: string;
};

export function isSessionExpiryCode(code: string | undefined): boolean {
  return (
    code === SESSION_EXPIRED_CODE || code === SESSION_IDLE_EXPIRED_CODE
  );
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
        error.message === 'Session expired. Please login again.'))
  );
}

function buildHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '');

  return `${normalizedBaseUrl}${normalizedPath}`;
}

async function parseResponse<T>(response: Response): Promise<ParsedResponse<T>> {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
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
  if (typeof data === 'string') {
    return data;
  }

  if (typeof data !== 'object' || data === null || !('message' in data)) {
    return undefined;
  }

  return data.message;
}

function getApiErrorCode<T>(data: ParsedResponse<T>): string | undefined {
  if (typeof data !== 'object' || data === null || !('code' in data)) {
    return undefined;
  }

  return typeof data.code === 'string' ? data.code : undefined;
}

function getApiErrorCanExtend<T>(
  data: ParsedResponse<T>,
): boolean | undefined {
  if (typeof data !== 'object' || data === null || !('canExtend' in data)) {
    return undefined;
  }

  return typeof data.canExtend === 'boolean' ? data.canExtend : undefined;
}

function dispatchSessionIdleExpiredEvent(): void {
  window.dispatchEvent(new Event(SESSION_IDLE_EXPIRED_EVENT));
}

function dispatchSessionExpiredEvent(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    ...options,
  });
  const data = await parseResponse<T>(response);

  if (!response.ok) {
    const errorMessage = getApiErrorMessage(data);
    const message = Array.isArray(errorMessage)
      ? errorMessage.join(', ')
      : errorMessage || response.statusText;
    const code = getApiErrorCode(data);
    const canExtend = getApiErrorCanExtend(data);

    const error = new ApiRequestError(
      message || 'Request failed',
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

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeBarberRecord(barber: BarberRecord): BarberRecord {
  return {
    ...barber,
    role: barber.role ?? 'junior',
    timezone: barber.timezone ?? 'Australia/Sydney',
    skills: Array.isArray(barber.skills) ? barber.skills : [],
    rating: toFiniteNumber(barber.rating),
    available: barber.available !== false,
    active: barber.active !== false,
  };
}

export function getCurrentSession() {
  return request<AuthResponse>('/admin-auth/session', {
    headers: buildHeaders(),
  });
}

export function loginAdmin(payload: AdminLoginPayload) {
  return request<AuthResponse>('/admin-auth/login', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function extendAdminSession() {
  return request<AuthResponse>('/admin-auth/extend', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export function getAccountProfile() {
  return request<AccountProfileResponse>('/admin-auth/me', {
    headers: buildHeaders(),
  });
}

export function logout() {
  return request<{ success: boolean }>('/admin-auth/logout', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export function getBarbers() {
  return request<BarberRecord[]>('/admin/barbers', {
    headers: buildHeaders(),
  }).then((barbers) => barbers.map(normalizeBarberRecord));
}

export function createBarber(payload: CreateBarberPayload) {
  return request<BarberRecord>('/admin/barbers', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }).then(normalizeBarberRecord);
}

export function updateBarber(id: string, payload: UpdateBarberPayload) {
  return request<BarberRecord>(`/admin/barbers/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }).then(normalizeBarberRecord);
}

export function deleteBarber(id: string) {
  return request<DeleteBarberResponse>(`/admin/barbers/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
}

export function getServiceAiConfigs() {
  return request<ServiceAiConfigRecord[]>('/admin/services', {
    headers: buildHeaders(),
  });
}

export function updateServiceAiConfig(
  id: string,
  payload: UpdateServiceAiConfigPayload,
) {
  return request<ServiceAiConfigRecord>(`/admin/services/${id}/ai-config`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function getSafetyRules() {
  return request<SafetyRuleRecord[]>('/admin/safety-rules', {
    headers: buildHeaders(),
  });
}

export function createSafetyRule(payload: CreateSafetyRulePayload) {
  return request<SafetyRuleRecord>('/admin/safety-rules', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateSafetyRule(id: string, payload: UpdateSafetyRulePayload) {
  return request<SafetyRuleRecord>(`/admin/safety-rules/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function getAppointmentBriefs() {
  return request<AppointmentBriefRecord[]>('/admin/briefs', {
    headers: buildHeaders(),
  });
}

export function getHairHistory() {
  return request<HairHistoryRecord[]>('/admin/hair-history', {
    headers: buildHeaders(),
  });
}

export function createAdminInvite(payload: CreateAdminInvitePayload) {
  return request<AdminInviteResponse>('/admin/invites', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function acceptAdminInvite(payload: AcceptAdminInvitePayload) {
  return request<AcceptAdminInviteResponse>('/admin/invites/accept', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}
