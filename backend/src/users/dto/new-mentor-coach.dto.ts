import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsE164Phone } from '../../common/validation/is-e164-phone.validator';

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
  @IsE164Phone()
  phone: string;
}
