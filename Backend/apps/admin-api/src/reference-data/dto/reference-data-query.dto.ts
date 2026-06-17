import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReferenceDataType } from '@coopers/entities';

export class ReferenceDataQueryDto {
  @ApiPropertyOptional({
    enum: ReferenceDataType,
    example: ReferenceDataType.BARBER_CAPABILITY,
  })
  @IsOptional()
  @IsEnum(ReferenceDataType)
  type?: ReferenceDataType;
}
