import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateJudgeDto {
  @ApiProperty({ example: 'Анна Петренко' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'anna.judge@gmail.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'b1f2c3d4-...' })
  @IsOptional()
  @IsUUID()
  venueId?: string;
}
