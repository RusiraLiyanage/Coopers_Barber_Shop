import {
  getAppointmentBriefs,
  type AppointmentBriefRecord,
  type PaginatedResponse,
  type PaginationRequest,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'briefs';

export const getAppointmentBriefsAction = createAppAsyncThunk<
  PaginatedResponse<AppointmentBriefRecord>,
  PaginationRequest | undefined
>(`${SLICE_NAME}/getAppointmentBriefs`, async (pagination) =>
  getAppointmentBriefs(pagination),
);
