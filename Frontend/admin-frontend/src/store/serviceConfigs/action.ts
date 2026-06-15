import {
  getServiceAiConfigs,
  updateServiceAiConfig,
  type ServiceAiConfigRecord,
  type UpdateServiceAiConfigPayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'serviceConfigs';

export const getServiceConfigsAction = createAppAsyncThunk<
  ServiceAiConfigRecord[]
>(`${SLICE_NAME}/getServiceConfigs`, async () => getServiceAiConfigs());

export const updateServiceConfigAction = createAppAsyncThunk<
  ServiceAiConfigRecord,
  { id: string; payload: UpdateServiceAiConfigPayload }
>(`${SLICE_NAME}/updateServiceConfig`, async ({ id, payload }) =>
  updateServiceAiConfig(id, payload),
);
