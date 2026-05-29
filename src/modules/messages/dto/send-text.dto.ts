import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'DB session id (UUID)' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ example: '628123456789' })
  @IsString()
  to: string;

  @ApiPropertyOptional({ enum: ['text', 'image', 'file'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'image', 'file'])
  type?: 'text' | 'image' | 'file' = 'text';

  @ApiPropertyOptional({ description: 'Required for text messages' })
  @ValidateIf((o) => !o.type || o.type === 'text')
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Media URL for image/file' })
  @ValidateIf((o) => o.type === 'image' || o.type === 'file')
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filename?: string;
}
