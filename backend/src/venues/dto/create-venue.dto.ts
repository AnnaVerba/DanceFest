import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'Сцена A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Головна сцена, велика зала' })
  @IsOptional()
  @IsString()
  description?: string;
}
