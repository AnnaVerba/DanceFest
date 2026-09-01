import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import {
  MIN_PASSWORD_LENGTH,
  LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE,
} from '../../auth/auth.constants';

export class CreateParticipantDto {
  @ApiProperty({ example: 'Іван' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Іванов' })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+380501234567' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'participant@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @ApiProperty({ example: '2010-05-20' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    description:
      'Заборонено — ліга обирається лише при подачі заявки на конкурс',
    required: false,
  })
  @IsEmpty({ message: LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE })
  leagueId?: string;
}
