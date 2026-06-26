export const ADMIN_REALTIME_NAMESPACE = '/admin/realtime';
export const ADMIN_DATA_CHANGED_EVENT = 'admin.data.changed';

export type AdminDataChangedReason =
  | 'appointment'
  | 'brief'
  | 'hair-history'
  | 'barber'
  | 'service'
  | 'safety-rule'
  | 'reference-data'
  | 'invite'
  | 'unknown';

export type AdminDataChangedPayload = {
  version: string;
  reason: AdminDataChangedReason;
};
