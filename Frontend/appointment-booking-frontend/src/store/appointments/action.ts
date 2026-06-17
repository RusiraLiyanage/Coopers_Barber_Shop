import { createAppAsyncThunk } from '../createAppAsyncThunk';
import {
  cancelAppointment,
  createAppointment,
  getAppointments,
  getAvailability,
  updateAppointment,
} from '../../lib/api';
import type {
  AppointmentAvailabilityPayload,
  AppointmentRecord,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from './types';

const SLICE_NAME = 'appointments';

export const getAppointmentsAction = createAppAsyncThunk<AppointmentRecord[]>(
  `${SLICE_NAME}/getAppointments`,
  async () => getAppointments(),
);

export const getAppointmentAvailabilityAction = createAppAsyncThunk<
  string[],
  AppointmentAvailabilityPayload
>(`${SLICE_NAME}/getAppointmentAvailability`, async (payload) =>
  getAvailability(payload),
);

export const createAppointmentAction = createAppAsyncThunk<
  AppointmentRecord,
  CreateAppointmentPayload
>(`${SLICE_NAME}/createAppointment`, async (payload) =>
  createAppointment(payload),
);

export const updateAppointmentAction = createAppAsyncThunk<
  AppointmentRecord,
  UpdateAppointmentPayload
>(`${SLICE_NAME}/updateAppointment`, async ({ appointmentId, data }) =>
  updateAppointment(appointmentId, data),
);

export const cancelAppointmentAction = createAppAsyncThunk<
  AppointmentRecord,
  string
>(`${SLICE_NAME}/cancelAppointment`, async (appointmentId) =>
  cancelAppointment(appointmentId),
);
