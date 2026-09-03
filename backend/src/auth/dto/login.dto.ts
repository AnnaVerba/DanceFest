import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '+380671234567',
    description: 'Phone number or email.',
  })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsNotEmpty()
  password: string;
}
