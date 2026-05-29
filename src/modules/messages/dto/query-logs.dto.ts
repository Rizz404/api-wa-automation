import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/helpers/pagination.helper';

export class QueryLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ enum: ['in', 'out'] })
  @IsOptional()
  @IsIn(['in', 'out'])
  direction?: 'in' | 'out';

  @ApiPropertyOptional({ enum: ['sent', 'delivered', 'read', 'failed'] })
  @IsOptional()
  @IsIn(['sent', 'delivered', 'read', 'failed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by phone' })
  @IsOptional()
  @IsString()
  phone?: string;
}
