import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'Marketing line' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'OpenWA session id; auto-generated when omitted',
    example: 'sales-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'sessionId may only contain letters, numbers, _ and -',
  })
  @MaxLength(100)
  sessionId?: string;
}
