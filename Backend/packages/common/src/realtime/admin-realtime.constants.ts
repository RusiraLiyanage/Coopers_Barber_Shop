export const ADMIN_REALTIME_NAMESPACE = '/admin/realtime';
export const ADMIN_DATA_CHANGED_EVENT = 'admin.data.changed';
export const ADMIN_REALTIME_DATA_CHANGED_ROUTE = 'internal/data-changed';
export const ADMIN_REALTIME_DATA_CHANGED_PATH =
  `${ADMIN_REALTIME_NAMESPACE}/${ADMIN_REALTIME_DATA_CHANGED_ROUTE}`;

export const ADMIN_DATA_CHANGED_REASONS = [
  'appointment',
  'brief',
  'hair-history',
  'barber',
  'service',
  'safety-rule',
  'reference-data',
  'invite',
  'unknown',
] as const;

export type AdminDataChangedReason =
  (typeof ADMIN_DATA_CHANGED_REASONS)[number];

export type AdminDataChangedPayload = {
  version: string;
  reason: AdminDataChangedReason;
};
