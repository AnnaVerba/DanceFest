import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class JudgeLoginDto {
  @ApiProperty({ example: 'anna.judge@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'AB3CD9FG' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
