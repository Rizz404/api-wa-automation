import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ActionDto {
  @ApiProperty({ description: 'Execution order (ascending)' })
  @IsInt()
  order: number;

  @ApiProperty({
    enum: ['send_text', 'send_image', 'send_file', 'forward', 'delay', 'condition'],
  })
  @IsIn(['send_text', 'send_image', 'send_file', 'forward', 'delay', 'condition'])
  actionType: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  actionConfig: Record<string, any>;
}

export class CreateAutomationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'DB session id this automation runs on' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ enum: ['message', 'schedule', 'webhook'] })
  @IsIn(['message', 'schedule', 'webhook'])
  triggerType: 'message' | 'schedule' | 'webhook';

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  triggerConfig: Record<string, any>;

  @ApiProperty({ type: [ActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];
}
