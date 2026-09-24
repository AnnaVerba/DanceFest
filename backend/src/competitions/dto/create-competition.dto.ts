import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
} from 'class-validator';

const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;

export class CreateCompetitionDto {
  @ApiPropertyOptional({ example: 'https://example.com/poster.jpg' })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({ example: 'https://example.com/regulations.pdf' })
  @IsOptional()
  @IsUrl()
  regulationsUrl?: string;

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

  @ApiProperty({ example: 'м. Львів, Палац культури' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: ['Студія східного танцю «Джерело»'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  organizers: string[];

  @ApiPropertyOptional({
    description:
      'Account id for each organizer name, same order; the nil UUID for a name with no account. Listed organizer accounts get the same rights as the owner.',
    example: ['0b3f6f0e-6d0a-4a3e-9d5e-3c1f2a4b5c6d'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  organizerIds?: string[];

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
