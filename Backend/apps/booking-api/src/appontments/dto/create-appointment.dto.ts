import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  HAIR_PHOTO_MEDIA_TYPES,
} from '../../consultation/dto/hair-photo.dto';
import type { HairPhotoMediaType } from '../../consultation/dto/hair-photo.dto';

export class AppointmentGoalPhotoDto {
  @ApiProperty({
    enum: HAIR_PHOTO_MEDIA_TYPES,
    example: 'image/jpeg',
  })
  @IsIn(HAIR_PHOTO_MEDIA_TYPES)
  mediaType!: HairPhotoMediaType;

  @ApiProperty({
    description:
      'Base64-encoded image data without a data URL prefix. This is persisted on the appointment brief for the barber.',
  })
  @IsString()
  @MaxLength(5_000_000)
  @Matches(/^[A-Za-z0-9+/]+={0,2}$/)
  data!: string;
}

export class CreateAppointmentDto {
  // The ID of the service to book an appointment for.
  @ApiProperty({ example: '0f70d4ad-29ab-45a4-b0d5-914dd4559777' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    required: false,
    description: 'The selected barber/staff member for the appointment.',
  })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  // The date for the appointment. Format: "YYYY-MM-DD".
  @ApiProperty({ example: '2026-06-15', format: 'date' })
  @IsDateString()
  date!: string; // e.g., "2025-09-22"

  // The time slot for the appointment. Format: "HH:mm-HH:mm". (start time-end time)
  @ApiProperty({ example: '09:45-10:15' })
  @IsString()
  slot!: string; // e.g., "09:45-10:15"

  @ApiProperty({
    example:
      'Client wants a natural brown finish and mentioned dry ends from previous colour.',
    required: false,
    description: 'Barber-facing consultation summary generated before booking.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  consultationSummary?: string;

  @ApiProperty({
    example: 'Customer mentioned recent bleach. Confirm hair condition first.',
    required: false,
    description: 'Safety notes generated during consultation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  safetyNotes?: string;

  @ApiProperty({
    example: ['dry hair', 'recent bleach'],
    required: false,
    type: [String],
    description: 'Hair state signals gathered during consultation.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  hairState?: string[];

  @ApiProperty({
    example: 'Natural brown colour with healthy-looking finish.',
    required: false,
    description: 'Customer desired result from the consultation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  desiredLook?: string;

  @ApiProperty({
    required: false,
    type: AppointmentGoalPhotoDto,
    description:
      'Optional goal/reference photo showing the look the customer wants to achieve.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppointmentGoalPhotoDto)
  goalPhoto?: AppointmentGoalPhotoDto;

  @ApiProperty({
    example: 'claude',
    enum: ['claude', 'fallback'],
    required: false,
    description: 'Source that generated the consultation recommendation.',
  })
  @IsOptional()
  @IsIn(['claude', 'fallback'])
  consultationGenerationSource?: 'claude' | 'fallback';

  @ApiProperty({
    example: 'claude-opus-4-8',
    required: false,
    description: 'Model that generated the consultation recommendation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  consultationGenerationModel?: string;
}
