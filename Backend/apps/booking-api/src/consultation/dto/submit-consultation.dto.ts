import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ConsultationAnswerDto } from './consultation-answer.dto';
import { HairPhotoDto } from './hair-photo.dto';

export class SubmitConsultationDto {
  @ApiProperty({ example: '0f70d4ad-29ab-45a4-b0d5-914dd4559777' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ type: [ConsultationAnswerDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConsultationAnswerDto)
  answers!: ConsultationAnswerDto[];

  @ApiProperty({
    required: false,
    type: HairPhotoDto,
    description:
      'Optional current hair photo for Claude vision analysis during consultation.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HairPhotoDto)
  hairPhoto?: HairPhotoDto;
}
