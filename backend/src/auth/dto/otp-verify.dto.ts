import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';
import { OTP_CODE_LENGTH } from '../otp.constants';

export class OtpVerifyDto {
  @ApiProperty({ example: '+380671234567' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: '1111' })
  @Matches(new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`))
  code: string;

  @ApiProperty({ example: 'strongPassword123', minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;
}
