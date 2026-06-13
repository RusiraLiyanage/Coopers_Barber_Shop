import type { AppointmentRecord } from '../../lib/api';

export type { AppointmentRecord };

export type AppointmentAvailabilityPayload = {
  serviceId: string;
  date: string;
  excludeAppointmentId?: string;
};

export type CreateAppointmentPayload = {
  serviceId: string;
  date: string;
  slot: string;
};

export type UpdateAppointmentPayload = {
  appointmentId: string;
  data: {
    date: string;
    slot: string;
  };
};

export type AppointmentsState = {
  items: AppointmentRecord[];
  availabilitySlots: string[];
  loading: boolean;
  loadingAvailability: boolean;
  mutating: boolean;
  cancelling: boolean;
  error: string | null;
};
