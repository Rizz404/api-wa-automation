import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional()
  @IsString()
  currentPassword: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
