import type {
  BarberRecord,
  CreateBarberPayload,
  UpdateBarberPayload,
} from '../../lib/api';

export type { BarberRecord, CreateBarberPayload, UpdateBarberPayload };

export type BarbersState = {
  items: BarberRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};
