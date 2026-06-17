import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ReferenceDataType } from '@coopers/entities';

export class CreateReferenceDataItemDto {
  @ApiProperty({
    enum: ReferenceDataType,
    example: ReferenceDataType.BARBER_CAPABILITY,
  })
  @IsEnum(ReferenceDataType)
  type: ReferenceDataType;

  @ApiProperty({ example: 'Texture specialist' })
  @IsString()
  @MaxLength(120)
  label: string;
}
