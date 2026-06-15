const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export type StaffRole = 'junior' | 'senior' | 'owner';
export type ServiceComplexity = 'low' | 'medium' | 'high';
export type SafetyRuleSeverity = 'low' | 'medium' | 'high';
export type UserRole = 'customer' | 'admin';

type ApiErrorPayload = {
  message?: string | string[];
  code?: string;
};

type ParsedResponse<T> = T | ApiErrorPayload | string | null;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
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
  bufferAfterMinutes?: number;
  skills?: string[];
  rating?: number;
  available?: boolean;
  active?: boolean;
};

export type UpdateBarberPayload = Partial<CreateBarberPayload>;

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

    throw new ApiRequestError(
      message || 'Request failed',
      response.status,
      getApiErrorCode(data),
    );
  }

  return data as T;
}

export function getCurrentSession() {
  return request<AuthResponse>('/auth/session', {
    headers: buildHeaders(),
  });
}

export function loginAdmin(payload: AdminLoginPayload) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function getAccountProfile() {
  return request<AccountProfileResponse>('/auth/me', {
    headers: buildHeaders(),
  });
}

export function logout() {
  return request<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export function getBarbers() {
  return request<BarberRecord[]>('/admin/barbers', {
    headers: buildHeaders(),
  });
}

export function createBarber(payload: CreateBarberPayload) {
  return request<BarberRecord>('/admin/barbers', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateBarber(id: string, payload: UpdateBarberPayload) {
  return request<BarberRecord>(`/admin/barbers/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
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
