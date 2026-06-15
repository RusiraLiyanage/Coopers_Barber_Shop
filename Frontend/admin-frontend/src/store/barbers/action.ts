import {
  createBarber,
  getBarbers,
  updateBarber,
  type BarberRecord,
  type CreateBarberPayload,
  type UpdateBarberPayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'barbers';

export const getBarbersAction = createAppAsyncThunk<BarberRecord[]>(
  `${SLICE_NAME}/getBarbers`,
  async () => getBarbers(),
);

export const createBarberAction = createAppAsyncThunk<
  BarberRecord,
  CreateBarberPayload
>(`${SLICE_NAME}/createBarber`, async (payload) => createBarber(payload));

export const updateBarberAction = createAppAsyncThunk<
  BarberRecord,
  { id: string; payload: UpdateBarberPayload }
>(`${SLICE_NAME}/updateBarber`, async ({ id, payload }) =>
  updateBarber(id, payload),
);
