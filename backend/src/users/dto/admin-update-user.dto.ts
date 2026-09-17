import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AccessLevel, ACCESS_LEVELS } from '../../auth/access-level.enum';
import { IsE164Phone } from '../../common/validation/is-e164-phone.validator';
import { IsValidBirthDate } from '../../common/validation/is-valid-birth-date.validator';
import { NormalizeEmail } from '../../common/validation/normalize-email.transform';
import { NormalizePhone } from '../../common/validation/normalize-phone.transform';

// An admin editing any user's profile. Only the fields sent change.
export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'Іван' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Іванов' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ example: '+380501234567' })
  @IsOptional()
  @NormalizePhone()
  @IsE164Phone()
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @NormalizeEmail()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '2010-05-20' })
  @IsOptional()
  @IsDateString()
  @IsValidBirthDate()
  birthDate?: string;

  @ApiPropertyOptional({ enum: ACCESS_LEVELS, example: AccessLevel.COACH })
  @IsOptional()
  @IsIn(ACCESS_LEVELS as readonly string[])
  accessLevel?: AccessLevel;
}
