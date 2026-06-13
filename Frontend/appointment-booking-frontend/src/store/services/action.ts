import { createAppAsyncThunk } from '../createAppAsyncThunk';
import { getServices } from '../../lib/api';
import type { ServiceOption } from './types';

const SLICE_NAME = 'services';

export const getServicesAction = createAppAsyncThunk<ServiceOption[]>(
  `${SLICE_NAME}/getServices`,
  async () => getServices(),
);
