import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PagingReqDto {
  @ApiPropertyOptional({ enum: Order, default: Order.ASC })
  @IsEnum(Order)
  @IsOptional()
  readonly order: Order = Order.ASC;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 30, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  readonly limit: number = 10;

  @ApiPropertyOptional({ default: 'created_at' })
  @IsString()
  @IsOptional()
  readonly orderField: string = 'created_at';

  get skip(): number {
    return this.limit * (this.page - 1);
  }

  get take(): number {
    return this.limit;
  }

  get field(): string {
    return this.orderField;
  }
}

export class PagingMetaDto {
  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly limit: number;

  @ApiProperty()
  readonly totalItem: number;

  @ApiProperty()
  readonly totalPage: number;

  @ApiProperty()
  readonly hasPreviousPage: boolean;

  @ApiProperty()
  readonly hasNextPage: boolean;

  constructor(pagingReqDto: PagingReqDto, totalItem: number) {
    this.page = pagingReqDto.page;
    this.limit = pagingReqDto.limit;
    this.totalItem = totalItem;
    this.totalPage = Math.ceil(this.totalItem / this.limit);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.totalPage;
  }
}

export interface PaginatedResult<T> {
  data: T[];
  pagingMeta: PagingMetaDto;
}
