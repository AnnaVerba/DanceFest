import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';
import { AccessLevel } from '../access-level.enum';

const REGISTRABLE_ROLES = [AccessLevel.PARTICIPANT, AccessLevel.COACH];

// Everyone registers as PARTICIPANT or COACH. A coach also sends the
// school id (the UI creates the school first when it is new). ORGANIZER is
// reached later through an admin-approved request.
export class RegisterDto {
  @ApiProperty({ example: 'Іван' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Іванов' })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+380501234567' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @ApiProperty({ example: '2010-05-20' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ enum: REGISTRABLE_ROLES, example: AccessLevel.PARTICIPANT })
  @IsIn(REGISTRABLE_ROLES)
  role: AccessLevel.PARTICIPANT | AccessLevel.COACH;

  @ApiProperty({
    required: false,
    description: 'Required when role is COACH.',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
