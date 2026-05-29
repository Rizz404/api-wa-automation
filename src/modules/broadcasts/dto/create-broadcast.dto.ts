import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BroadcastRecipientInput {
  @ApiProperty({ example: '628123456789' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

export class CreateBroadcastDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'DB session id' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Template, supports {{variable}}' })
  @IsString()
  template: string;

  @ApiPropertyOptional({ minimum: 3000, default: 3000 })
  @IsOptional()
  @IsInt()
  @Min(3000)
  delayMs?: number;

  @ApiPropertyOptional({ type: [BroadcastRecipientInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BroadcastRecipientInput)
  recipients?: BroadcastRecipientInput[];

  @ApiPropertyOptional({ type: [String], description: 'Contact ids to include' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  contactIds?: string[];

  @ApiPropertyOptional({ description: 'ISO datetime to schedule; omit = manual send' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
