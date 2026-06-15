import type { HairHistoryRecord } from '../../lib/api';

export type { HairHistoryRecord };

export type HairHistoryState = {
  items: HairHistoryRecord[];
  loading: boolean;
  error: string | null;
};
