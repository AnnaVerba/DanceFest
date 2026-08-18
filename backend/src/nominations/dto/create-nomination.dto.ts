import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateNominationDto {
  @ApiProperty({ example: 'Соло · Діти · Латина' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
