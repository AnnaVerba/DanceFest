import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class NewMentorCoachDto {
  @ApiProperty({ example: 'Петро' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Іваненко' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+380501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
