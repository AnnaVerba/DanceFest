import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsE164Phone } from '../../common/validation/is-e164-phone.validator';

export class LoginDto {
  @ApiProperty({ example: '+380671234567' })
  @IsNotEmpty()
  @IsE164Phone()
  login: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsNotEmpty()
  password: string;
}
