import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';

const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;

export class CreateCompetitionDto {
  @ApiPropertyOptional({ example: 'https://example.com/poster.jpg' })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiProperty({ example: 'Зірки Танцполу 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Щорічний конкурс бальних танців для всіх вікових категорій.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '2026-09-10' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ example: '2026-09-12' })
  @IsDateString()
  dateTo: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  registrationFrom: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  registrationTo: string;

  @ApiProperty({ example: '+380501234567' })
  @IsString()
  @Matches(PHONE_REGEX, {
    message: 'contactNumber must be a valid phone number',
  })
  contactNumber: string;

  @ApiProperty({ example: 'admin@studio.ua' })
  @IsEmail()
  contactEmail: string;
}
