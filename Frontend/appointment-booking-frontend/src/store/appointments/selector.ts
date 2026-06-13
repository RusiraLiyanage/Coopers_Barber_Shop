import type { RootState } from '../index';

export const selectAppointments = (state: RootState) =>
  state.appointments.items;

export const selectAppointmentsLoading = (state: RootState) =>
  state.appointments.loading;

export const selectAppointmentsError = (state: RootState) =>
  state.appointments.error;

export const selectAppointmentAvailabilitySlots = (state: RootState) =>
  state.appointments.availabilitySlots;

export const selectAppointmentAvailabilityLoading = (state: RootState) =>
  state.appointments.loadingAvailability;

export const selectAppointmentMutating = (state: RootState) =>
  state.appointments.mutating;

export const selectAppointmentCancelling = (state: RootState) =>
  state.appointments.cancelling;
