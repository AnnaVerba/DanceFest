import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateJudgeDto {
  @ApiProperty({ example: 'Анна Петренко' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'anna.judge@gmail.com' })
  @IsEmail()
  email: string;
}
