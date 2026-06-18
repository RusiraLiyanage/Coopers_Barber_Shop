import {
  createBarber,
  deleteBarber,
  getBarbers,
  updateBarber,
  type BarberRecord,
  type CreateBarberPayload,
  type DeleteBarberResponse,
  type PaginatedResponse,
  type PaginationRequest,
  type UpdateBarberPayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'barbers';

export const getBarbersAction = createAppAsyncThunk<
  PaginatedResponse<BarberRecord>,
  PaginationRequest | undefined
>(
  `${SLICE_NAME}/getBarbers`,
  async (pagination) => getBarbers(pagination),
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

export const deleteBarberAction = createAppAsyncThunk<
  DeleteBarberResponse & { id: string },
  string
>(`${SLICE_NAME}/deleteBarber`, async (id) => ({
  ...(await deleteBarber(id)),
  id,
}));
