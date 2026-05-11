import { IsUUID, IsDateString, IsString } from 'class-validator';

export class CreateAppointmentDto {
  // The ID of the service to book an appointment for.
  @IsUUID()
  serviceId: string;

  // The date for the appointment. Format: "YYYY-MM-DD".
  @IsDateString()
  date: string; // e.g., "2025-09-22"

  // The time slot for the appointment. Format: "HH:mm-HH:mm". (start time-end time)
  @IsString()
  slot: string; // e.g., "09:45-10:15"
}
