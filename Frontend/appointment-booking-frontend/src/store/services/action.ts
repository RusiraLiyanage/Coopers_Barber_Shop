import { createAsyncThunk } from '@reduxjs/toolkit';
import { getServices } from '../../lib/api';
import type { ServiceOption } from './types';

const BASE_URL = 'services';

export const getServicesAction = createAsyncThunk<ServiceOption[]>(
  `${BASE_URL}/getServices`,
  async () => getServices(),
);
