import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE,
  MIN_PASSWORD_LENGTH,
} from '../auth.constants';
import { Role } from '../roles.enum';

export class RegisterDto {
  @ApiProperty({ enum: Role, example: Role.PARTICIPANT })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @ApiProperty({
    description: 'Required for role=ADMIN only.',
    example: 'Анна Верба',
    required: false,
  })
  @ValidateIf((dto: RegisterDto) => dto.role === Role.ADMIN)
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Required for every role except ADMIN.',
    example: 'Іван',
    required: false,
  })
  @ValidateIf((dto: RegisterDto) => dto.role !== Role.ADMIN)
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Required for every role except ADMIN.',
    example: 'Іванов',
    required: false,
  })
  @ValidateIf((dto: RegisterDto) => dto.role !== Role.ADMIN)
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Required for every role except ADMIN.',
    example: '+380501234567',
    required: false,
  })
  @ValidateIf((dto: RegisterDto) => dto.role !== Role.ADMIN)
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Required for role=PARTICIPANT only.',
    example: '2010-05-20',
    required: false,
  })
  @ValidateIf((dto: RegisterDto) => dto.role === Role.PARTICIPANT)
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    description: 'Required for role=PARTICIPANT only.',
    example: 'a1b2c3d4-...',
    required: false,
  })
  @ValidateIf((dto: RegisterDto) => dto.role === Role.PARTICIPANT)
  @IsUUID()
  coachId: string;

  @ApiProperty({
    description: 'Required for role=COACH only.',
    example: 'a1b2c3d4-...',
    required: false,
  })
  @ValidateIf((dto: RegisterDto) => dto.role === Role.COACH)
  @IsUUID()
  schoolId: string;

  @ApiProperty({
    description:
      'Заборонено — ліга обирається лише при подачі заявки на конкурс.',
    required: false,
  })
  @IsEmpty({ message: LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE })
  leagueId?: string;
}
