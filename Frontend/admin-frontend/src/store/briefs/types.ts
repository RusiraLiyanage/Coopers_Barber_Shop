import type { AppointmentBriefRecord, PagingMeta } from '../../lib/api';

export type { AppointmentBriefRecord };

export type BriefsState = {
  items: AppointmentBriefRecord[];
  pagingMeta: PagingMeta | null;
  loading: boolean;
  error: string | null;
};
