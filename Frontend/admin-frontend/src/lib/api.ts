import { getRuntimeConfigValue } from './runtimeConfig';

const API_BASE_URL = getRuntimeConfigValue(
  'VITE_API_URL',
  'http://localhost:7311',
);
const ADMIN_BROWSER_SESSION_KEY = 'coopers_admin_auth_browser_session';
const ADMIN_REMEMBERED_SESSION_KEY = 'coopers_admin_auth_remembered_session';
const ADMIN_HAD_SESSION_KEY = 'coopers_admin_auth_had_session';
export const ADMIN_SESSION_REPLACED_SIGNAL_KEY =
  'coopers_admin_auth_session_replaced';
const IDEMPOTENT_REQUEST_RETRY_DELAY_MS = 300;
export const SESSION_EXPIRED_CODE = 'SESSION_EXPIRED';
export const SESSION_IDLE_EXPIRED_CODE = 'SESSION_IDLE_EXPIRED';
export const ACTIVE_ACCOUNT_SESSION_EXISTS_CODE =
  'ACTIVE_ACCOUNT_SESSION_EXISTS';
export const SESSION_IDLE_EXPIRED_EVENT = 'coopers-admin-session-idle-expired';
export const SESSION_EXPIRED_EVENT = 'coopers-admin-session-expired';

export type StaffRole = 'junior' | 'senior' | 'owner';
export type StaffGender = 'male' | 'female' | 'non_binary' | 'unspecified';
export type ServiceComplexity = 'low' | 'medium' | 'high';
export type SafetyRuleSeverity = 'low' | 'medium' | 'high';
export type UserRole = 'customer' | 'admin';
export type ReferenceDataType = 'barber_capability' | 'safety_trigger';

export interface PagingMeta {
  page: number;
  limit: number;
  totalItem: number;
  totalPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagingMeta: PagingMeta;
}

export type PaginationRequest = {
  page?: number;
  limit?: number;
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

export interface AdminLoginResponse extends AuthResponse {
  authenticated: true;
  user?: AccountProfileResponse;
}

export type AdminDataVersionResponse = {
  version: string;
};

export type AdminLoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
  endExistingSessions?: boolean;
};

export interface BarberRecord {
  id: string;
  displayName: string;
  email: string | null;
  gender: StaffGender;
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

export interface ReferenceDataItemRecord {
  id: string;
  type: ReferenceDataType;
  label: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyRuleRecord {
  id: string;
  condition: string;
  serviceIds: string[];
  services: Array<{
    id: string;
    name: string;
  }>;
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
  goalPhoto: {
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
    data: string;
  } | null;
  generationSource: 'claude' | 'fallback';
  generationModel: string | null;
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

export type CreateHairHistoryFromBriefPayload = {
  productsUsed?: string;
  barberNotes?: string;
  visitDate?: string;
};

export type CreateBarberPayload = {
  displayName: string;
  email?: string;
  gender?: StaffGender;
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

export type CreateServicePayload = {
  name: string;
  durationMinutes: number;
  requiredSkills?: string[];
  safetyTriggers?: string[];
  complexity?: ServiceComplexity;
  isActive?: boolean;
};

export type UpdateServicePayload = Partial<CreateServicePayload>;

export type CreateSafetyRulePayload = {
  condition: string;
  serviceIds: string[];
  message: string;
  severity?: SafetyRuleSeverity;
  active?: boolean;
};

export type UpdateSafetyRulePayload = Partial<CreateSafetyRulePayload>;

export type CreateReferenceDataItemPayload = {
  type: ReferenceDataType;
  label: string;
};

export type UpdateReferenceDataItemPayload = {
  label: string;
};

export type DeleteReferenceDataItemResponse = {
  success: true;
};

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

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const value = query.toString();

  return value ? `?${value}` : '';
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

function rememberAdminAuthSession(remember: boolean): void {
  setSessionStorageValue(ADMIN_BROWSER_SESSION_KEY, 'true');
  setLocalStorageValue(ADMIN_HAD_SESSION_KEY, 'true');

  if (remember) {
    setLocalStorageValue(ADMIN_REMEMBERED_SESSION_KEY, 'true');
    return;
  }

  removeLocalStorageValue(ADMIN_REMEMBERED_SESSION_KEY);
}

function markRestoredAdminAuthSession(): void {
  if (
    getSessionStorageValue(ADMIN_BROWSER_SESSION_KEY) === 'true' ||
    getLocalStorageValue(ADMIN_REMEMBERED_SESSION_KEY) === 'true'
  ) {
    setSessionStorageValue(ADMIN_BROWSER_SESSION_KEY, 'true');
  }
}

export function canRestoreAdminAuthSession(): boolean {
  return (
    getSessionStorageValue(ADMIN_BROWSER_SESSION_KEY) === 'true' ||
    getLocalStorageValue(ADMIN_REMEMBERED_SESSION_KEY) === 'true'
  );
}

function hasTrackedAdminSession(): boolean {
  return getLocalStorageValue(ADMIN_HAD_SESSION_KEY) === 'true';
}

export function shouldClearStaleAdminAuthSession(): boolean {
  return !canRestoreAdminAuthSession() && hasTrackedAdminSession();
}

export function clearAdminAuthSession(): void {
  removeSessionStorageValue(ADMIN_BROWSER_SESSION_KEY);
  removeLocalStorageValue(ADMIN_REMEMBERED_SESSION_KEY);
  removeLocalStorageValue(ADMIN_HAD_SESSION_KEY);
}

export function clearCurrentAdminTabAuthSession(): void {
  removeSessionStorageValue(ADMIN_BROWSER_SESSION_KEY);
}

function broadcastAdminSessionReplacement(): void {
  setLocalStorageValue(
    ADMIN_SESSION_REPLACED_SIGNAL_KEY,
    `${Date.now()}:${Math.random()}`,
  );
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isIdempotentRequest(options: RequestInit): boolean {
  const method = options.method?.toUpperCase() ?? 'GET';

  return method === 'GET' || method === 'HEAD';
}

function shouldRetryRequest(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) {
    return true;
  }

  return (
    error.statusCode === 502 ||
    error.statusCode === 503 ||
    error.statusCode === 504
  );
}

async function requestOnce<T>(
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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    return await requestOnce<T>(path, options);
  } catch (error) {
    if (!isIdempotentRequest(options) || !shouldRetryRequest(error)) {
      throw error;
    }

    await delay(IDEMPOTENT_REQUEST_RETRY_DELAY_MS);
    return requestOnce<T>(path, options);
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeBarberRecord(barber: BarberRecord): BarberRecord {
  return {
    ...barber,
    gender: barber.gender ?? 'unspecified',
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
  }).then((response) => {
    if (response.authenticated) {
      markRestoredAdminAuthSession();
    }

    return response;
  });
}

export function loginAdmin(payload: AdminLoginPayload) {
  return request<AdminLoginResponse>('/admin-auth/login', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }).then((response) => {
    if (response.authenticated) {
      rememberAdminAuthSession(payload.remember === true);

      if (payload.endExistingSessions === true) {
        broadcastAdminSessionReplacement();
      }
    }

    return response;
  });
}

export function extendAdminSession() {
  return request<AuthResponse>('/admin-auth/extend', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  }).then((response) => {
    if (response.authenticated) {
      markRestoredAdminAuthSession();
    }

    return response;
  });
}

export function getAccountProfile() {
  return request<AccountProfileResponse>('/admin-auth/me', {
    headers: buildHeaders(),
  });
}

export function logout() {
  clearAdminAuthSession();

  return request<{ success: boolean }>('/admin-auth/logout', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export function getAdminDataVersion() {
  return request<AdminDataVersionResponse>('/admin/data-version', {
    headers: buildHeaders(),
  });
}

export function getBarbers(pagination: PaginationRequest = {}) {
  return request<PaginatedResponse<BarberRecord>>(
    `/admin/barbers${buildQueryString(pagination)}`,
    {
      headers: buildHeaders(),
    },
  ).then((response) => {
    return {
      ...response,
      data: response.data.map(normalizeBarberRecord),
    };
  });
}

export function createBarber(payload: CreateBarberPayload) {
  return request<BarberRecord>('/admin/barbers', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }).then((barber) => {
    return normalizeBarberRecord(barber);
  });
}

export function updateBarber(id: string, payload: UpdateBarberPayload) {
  return request<BarberRecord>(`/admin/barbers/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }).then((barber) => {
    return normalizeBarberRecord(barber);
  });
}

export function deleteBarber(id: string) {
  return request<DeleteBarberResponse>(`/admin/barbers/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
}

export function getServiceAiConfigs(pagination: PaginationRequest = {}) {
  return request<PaginatedResponse<ServiceAiConfigRecord>>(
    `/admin/services${buildQueryString(pagination)}`,
    {
      headers: buildHeaders(),
    },
  );
}

export function createService(payload: CreateServicePayload) {
  return request<ServiceAiConfigRecord>('/admin/services', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateService(id: string, payload: UpdateServicePayload) {
  return request<ServiceAiConfigRecord>(`/admin/services/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
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

export function getSafetyRules(pagination: PaginationRequest = {}) {
  return request<PaginatedResponse<SafetyRuleRecord>>(
    `/admin/safety-rules${buildQueryString(pagination)}`,
    {
      headers: buildHeaders(),
    },
  );
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

export function getReferenceData(
  type?: ReferenceDataType,
  pagination: PaginationRequest = {},
) {
  const query = buildQueryString({ type, ...pagination });

  return request<PaginatedResponse<ReferenceDataItemRecord>>(
    `/admin/reference-data${query}`,
    {
      headers: buildHeaders(),
    },
  );
}

export function createReferenceDataItem(payload: CreateReferenceDataItemPayload) {
  return request<ReferenceDataItemRecord>('/admin/reference-data', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateReferenceDataItem(
  id: string,
  payload: UpdateReferenceDataItemPayload,
) {
  return request<ReferenceDataItemRecord>(`/admin/reference-data/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export function deleteReferenceDataItem(id: string) {
  return request<DeleteReferenceDataItemResponse>(
    `/admin/reference-data/${id}`,
    {
      method: 'DELETE',
      headers: buildHeaders(),
    },
  );
}

export function getAppointmentBriefs(pagination: PaginationRequest = {}) {
  return request<PaginatedResponse<AppointmentBriefRecord>>(
    `/admin/briefs${buildQueryString(pagination)}`,
    {
      headers: buildHeaders(),
    },
  );
}

export function getHairHistory(pagination: PaginationRequest = {}) {
  return request<PaginatedResponse<HairHistoryRecord>>(
    `/admin/hair-history${buildQueryString(pagination)}`,
    {
      headers: buildHeaders(),
    },
  );
}

export function createHairHistoryFromBrief(
  briefId: string,
  payload: CreateHairHistoryFromBriefPayload,
) {
  return request<HairHistoryRecord>(`/admin/briefs/${briefId}/hair-history`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
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
