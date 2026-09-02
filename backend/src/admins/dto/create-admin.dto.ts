import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../auth/auth.constants';

export class CreateAdminDto {
  @ApiProperty({ example: 'Анна Верба' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;
}
