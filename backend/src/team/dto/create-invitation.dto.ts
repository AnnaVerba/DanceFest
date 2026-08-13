import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'o.petrenko@studio.ua' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Олена Петренко', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
