import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'My Company' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'https://openwa.fts-tech.co.id' })
  @IsUrl({ require_tld: false })
  openwaBaseUrl: string;

  @ApiProperty({ description: 'OpenWA API key (stored encrypted)' })
  @IsString()
  openwaApiKey: string;
}
