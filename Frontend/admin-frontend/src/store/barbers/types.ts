import type {
  BarberRecord,
  CreateBarberPayload,
  PagingMeta,
  UpdateBarberPayload,
} from '../../lib/api';

export type { BarberRecord, CreateBarberPayload, UpdateBarberPayload };

export type BarbersState = {
  items: BarberRecord[];
  pagingMeta: PagingMeta | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
};
