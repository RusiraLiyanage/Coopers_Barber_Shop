import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  cancelAppointmentAction,
  createAppointmentAction,
  getAppointmentAvailabilityAction,
  getAppointmentsAction,
  updateAppointmentAction,
} from './action';
import type { AppointmentRecord, AppointmentsState } from './types';

const initialState: AppointmentsState = {
  items: [],
  availabilitySlots: [],
  loading: false,
  loadingAvailability: false,
  mutating: false,
  cancelling: false,
};

function upsertAppointment(
  appointments: AppointmentRecord[],
  appointment: AppointmentRecord,
) {
  const appointmentIndex = appointments.findIndex(
    (currentAppointment) => currentAppointment.id === appointment.id,
  );

  if (appointmentIndex === -1) {
    appointments.push(appointment);
    return;
  }

  appointments[appointmentIndex] = appointment;
}

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    clearAppointments(state) {
      state.items = [];
    },
    clearAvailabilitySlots(state) {
      state.availabilitySlots = [];
    },
    setAvailabilitySlots(state, action: PayloadAction<string[]>) {
      state.availabilitySlots = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAppointmentsAction.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAppointmentsAction.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(getAppointmentsAction.rejected, (state) => {
        state.loading = false;
      })
      .addCase(getAppointmentAvailabilityAction.pending, (state) => {
        state.loadingAvailability = true;
        state.availabilitySlots = [];
      })
      .addCase(getAppointmentAvailabilityAction.fulfilled, (state, action) => {
        state.availabilitySlots = action.payload;
        state.loadingAvailability = false;
      })
      .addCase(getAppointmentAvailabilityAction.rejected, (state) => {
        state.availabilitySlots = [];
        state.loadingAvailability = false;
      })
      .addCase(createAppointmentAction.pending, (state) => {
        state.mutating = true;
      })
      .addCase(createAppointmentAction.fulfilled, (state, action) => {
        upsertAppointment(state.items, action.payload);
        state.mutating = false;
      })
      .addCase(createAppointmentAction.rejected, (state) => {
        state.mutating = false;
      })
      .addCase(updateAppointmentAction.pending, (state) => {
        state.mutating = true;
      })
      .addCase(updateAppointmentAction.fulfilled, (state, action) => {
        upsertAppointment(state.items, action.payload);
        state.mutating = false;
      })
      .addCase(updateAppointmentAction.rejected, (state) => {
        state.mutating = false;
      })
      .addCase(cancelAppointmentAction.pending, (state) => {
        state.cancelling = true;
      })
      .addCase(cancelAppointmentAction.fulfilled, (state, action) => {
        upsertAppointment(state.items, action.payload);
        state.cancelling = false;
      })
      .addCase(cancelAppointmentAction.rejected, (state) => {
        state.cancelling = false;
      });
  },
});

export const { clearAppointments, clearAvailabilitySlots, setAvailabilitySlots } =
  appointmentsSlice.actions;

export default appointmentsSlice.reducer;
