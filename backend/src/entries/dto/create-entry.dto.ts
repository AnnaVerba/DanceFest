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

  @ApiProperty({
    example: 'Solo · Mini Kids · Debut · Free Dance',
    description:
      'Must match the name of an existing nomination for this competition.',
  })
  @IsString()
  @IsNotEmpty()
  nomination: string;

  @ApiPropertyOptional({ example: 1 })
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
