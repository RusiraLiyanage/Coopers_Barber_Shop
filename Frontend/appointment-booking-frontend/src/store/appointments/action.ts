import { createAsyncThunk } from '@reduxjs/toolkit';
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

const BASE_URL = 'appointments';

export const getAppointmentsAction = createAsyncThunk<AppointmentRecord[]>(
  `${BASE_URL}/getAppointments`,
  async () => getAppointments(),
);

export const getAppointmentAvailabilityAction = createAsyncThunk<
  string[],
  AppointmentAvailabilityPayload
>(`${BASE_URL}/getAppointmentAvailability`, async (payload) =>
  getAvailability(
    payload.serviceId,
    payload.date,
    payload.excludeAppointmentId,
  ),
);

export const createAppointmentAction = createAsyncThunk<
  AppointmentRecord,
  CreateAppointmentPayload
>(`${BASE_URL}/createAppointment`, async (payload) =>
  createAppointment(payload),
);

export const updateAppointmentAction = createAsyncThunk<
  AppointmentRecord,
  UpdateAppointmentPayload
>(`${BASE_URL}/updateAppointment`, async ({ appointmentId, data }) =>
  updateAppointment(appointmentId, data),
);

export const cancelAppointmentAction = createAsyncThunk<
  AppointmentRecord,
  string
>(`${BASE_URL}/cancelAppointment`, async (appointmentId) =>
  cancelAppointment(appointmentId),
);
