import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateReferenceDataItemDto {
  @ApiProperty({ example: 'Texture specialist' })
  @IsString()
  @MaxLength(120)
  label: string;
}
