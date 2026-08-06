import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Анна Верба' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@studio.ua' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: 6 })
  @MinLength(6)
  password: string;
}
