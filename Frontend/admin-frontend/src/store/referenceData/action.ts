import {
  createReferenceDataItem,
  deleteReferenceDataItem,
  getReferenceData,
  updateReferenceDataItem,
  type CreateReferenceDataItemPayload,
  type DeleteReferenceDataItemResponse,
  type PaginatedResponse,
  type PaginationRequest,
  type ReferenceDataItemRecord,
  type ReferenceDataType,
  type UpdateReferenceDataItemPayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'referenceData';

export const getReferenceDataAction = createAppAsyncThunk<
  PaginatedResponse<ReferenceDataItemRecord>,
  ({ type?: ReferenceDataType } & PaginationRequest) | undefined
>(`${SLICE_NAME}/getReferenceData`, async (params) =>
  getReferenceData(params?.type, params),
);

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
  Pick<ReferenceDataItemRecord, 'id' | 'type'>
>(`${SLICE_NAME}/deleteReferenceDataItem`, async (item) => ({
  ...(await deleteReferenceDataItem(item.id)),
  id: item.id,
}));
