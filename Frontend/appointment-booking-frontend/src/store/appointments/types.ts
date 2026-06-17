import type {
  AppointmentRecord,
  CreateAppointmentRequest,
} from '../../lib/api';

export type { AppointmentRecord };

export type AppointmentAvailabilityPayload = {
  serviceId: string;
  date: string;
  staffId?: string;
  excludeAppointmentId?: string;
};

export type CreateAppointmentPayload = CreateAppointmentRequest;

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
};
