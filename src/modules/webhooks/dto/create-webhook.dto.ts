import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'https://example.com/hook' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({ description: 'HMAC signing secret' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({
    type: [String],
    example: ['message.received', 'session.connected'],
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retryCount?: number;

  @ApiPropertyOptional({ default: 10000 })
  @IsOptional()
  @IsInt()
  timeoutMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
