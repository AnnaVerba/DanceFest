import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class JudgeLoginDto {
  @ApiProperty({ example: 'anna.judge@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'K7M2P9QX' })
  @IsNotEmpty()
  password: string;
}
