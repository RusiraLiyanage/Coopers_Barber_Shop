import { IsUUID, IsDateString } from 'class-validator';

export class AvailabilityQueryDto {
  // The ID of the service to check availability for.
  @IsUUID()
  serviceId: string;

  // The date to check availability on. Format: "YYYY-MM-DD".
  @IsDateString()
  date: string; // "YYYY-MM-DD"
}
