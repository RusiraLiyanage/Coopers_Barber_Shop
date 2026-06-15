import type { AppointmentBriefRecord } from '../../lib/api';

export type { AppointmentBriefRecord };

export type BriefsState = {
  items: AppointmentBriefRecord[];
  loading: boolean;
  error: string | null;
};
