import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SendBulkDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ type: [String], example: ['628111', '628222'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Delay between messages in ms', default: 3000 })
  @IsOptional()
  delayMs?: number;
}
