import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import {
  MIN_PASSWORD_LENGTH,
  LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE,
} from '../../auth/auth.constants';

export class CreateRosterParticipantDto {
  @ApiProperty({ example: 'Іван' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Іванов' })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+380501234567' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '2010-05-20' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: 'participant@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'strongPassword123',
    minLength: MIN_PASSWORD_LENGTH,
    required: false,
    description: 'Omitted for a roster dancer; set later when they claim.',
  })
  @IsOptional()
  @MinLength(MIN_PASSWORD_LENGTH)
  password?: string;

  @ApiProperty({
    description:
      'Required when the caller is an ORGANIZER; ignored for a COACH (forced to the caller).',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  coachId?: string;

  @ApiProperty({
    description:
      'Заборонено — ліга обирається лише при подачі заявки на конкурс',
    required: false,
  })
  @IsEmpty({ message: LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE })
  leagueId?: string;
}
