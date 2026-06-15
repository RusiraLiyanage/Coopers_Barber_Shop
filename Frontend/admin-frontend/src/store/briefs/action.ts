import {
  getAppointmentBriefs,
  type AppointmentBriefRecord,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'briefs';

export const getAppointmentBriefsAction = createAppAsyncThunk<
  AppointmentBriefRecord[]
>(`${SLICE_NAME}/getAppointmentBriefs`, async () => getAppointmentBriefs());
