import {
  createService,
  getServiceAiConfigs,
  updateService,
  type CreateServicePayload,
  type ServiceAiConfigRecord,
  type UpdateServicePayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'serviceConfigs';

export const getServiceConfigsAction = createAppAsyncThunk<
  ServiceAiConfigRecord[]
>(`${SLICE_NAME}/getServiceConfigs`, async () => getServiceAiConfigs());

export const createServiceConfigAction = createAppAsyncThunk<
  ServiceAiConfigRecord,
  CreateServicePayload
>(`${SLICE_NAME}/createServiceConfig`, async (payload) =>
  createService(payload),
);

export const updateServiceConfigAction = createAppAsyncThunk<
  ServiceAiConfigRecord,
  { id: string; payload: UpdateServicePayload }
>(`${SLICE_NAME}/updateServiceConfig`, async ({ id, payload }) =>
  updateService(id, payload),
);
