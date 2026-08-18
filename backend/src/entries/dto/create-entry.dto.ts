import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ example: 'Beautiful Life' })
  @IsString()
  @IsNotEmpty()
  routineName: string;

  @ApiProperty({ example: 'Соло · Діти · Латина' })
  @IsString()
  @IsNotEmpty()
  nomination: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  participantsCount?: number;

  @ApiPropertyOptional({ example: 'StarFamily' })
  @IsOptional()
  @IsString()
  studioName?: string;

  @ApiPropertyOptional({ example: 'Анна Луцкевич' })
  @IsOptional()
  @IsString()
  choreographer?: string;

  @ApiPropertyOptional({ example: 'Львів' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  improv?: boolean;

  @ApiPropertyOptional({ example: 'card', enum: ['cash', 'card'] })
  @IsOptional()
  @IsIn(['cash', 'card'])
  paymentMethod?: 'cash' | 'card';
}
