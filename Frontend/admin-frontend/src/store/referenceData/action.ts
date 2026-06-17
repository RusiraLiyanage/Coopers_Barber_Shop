import {
  createReferenceDataItem,
  deleteReferenceDataItem,
  getReferenceData,
  updateReferenceDataItem,
  type CreateReferenceDataItemPayload,
  type DeleteReferenceDataItemResponse,
  type ReferenceDataItemRecord,
  type UpdateReferenceDataItemPayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'referenceData';

export const getReferenceDataAction = createAppAsyncThunk<
  ReferenceDataItemRecord[]
>(`${SLICE_NAME}/getReferenceData`, async () => getReferenceData());

export const createReferenceDataItemAction = createAppAsyncThunk<
  ReferenceDataItemRecord,
  CreateReferenceDataItemPayload
>(`${SLICE_NAME}/createReferenceDataItem`, async (payload) =>
  createReferenceDataItem(payload),
);

export const updateReferenceDataItemAction = createAppAsyncThunk<
  ReferenceDataItemRecord,
  { id: string; payload: UpdateReferenceDataItemPayload }
>(`${SLICE_NAME}/updateReferenceDataItem`, async ({ id, payload }) =>
  updateReferenceDataItem(id, payload),
);

export const deleteReferenceDataItemAction = createAppAsyncThunk<
  DeleteReferenceDataItemResponse & { id: string },
  string
>(`${SLICE_NAME}/deleteReferenceDataItem`, async (id) => ({
  ...(await deleteReferenceDataItem(id)),
  id,
}));
