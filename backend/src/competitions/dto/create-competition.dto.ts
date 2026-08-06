import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateCompetitionDto {
  @ApiProperty({ example: 'Зірки Танцполу 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Київ, Палац Спорту' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 'Латина' })
  @IsString()
  @IsNotEmpty()
  style: string;
}
