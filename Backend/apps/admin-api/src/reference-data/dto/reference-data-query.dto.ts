import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReferenceDataType } from '@coopers/entities';
import { PagingReqDto } from '../../common/pagination.dto';

export class ReferenceDataQueryDto extends PagingReqDto {
  @ApiPropertyOptional({
    enum: ReferenceDataType,
    example: ReferenceDataType.BARBER_CAPABILITY,
  })
  @IsOptional()
  @IsEnum(ReferenceDataType)
  type?: ReferenceDataType;
}
