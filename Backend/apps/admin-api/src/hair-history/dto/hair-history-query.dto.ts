import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PagingReqDto } from '../../common/pagination.dto';

export class HairHistoryQueryDto extends PagingReqDto {
  @ApiPropertyOptional({ example: '3f80f26d-3278-4bdf-9de2-a6f13adf64d3' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ example: '9d40f26d-3278-4bdf-9de2-a6f13adf64d3' })
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
