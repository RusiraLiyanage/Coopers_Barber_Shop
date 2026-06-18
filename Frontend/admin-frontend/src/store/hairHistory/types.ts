import type { HairHistoryRecord, PagingMeta } from '../../lib/api';

export type { HairHistoryRecord };

export type HairHistoryState = {
  items: HairHistoryRecord[];
  pagingMeta: PagingMeta | null;
  loading: boolean;
  error: string | null;
};
