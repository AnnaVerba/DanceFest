import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ example: 'Beautiful Life' })
  @IsString()
  @IsNotEmpty()
  routineName: string;

  @ApiPropertyOptional({
    example: 'e7c1a2b4-5d6f-4a8b-9c0d-1e2f3a4b5c6d',
    description:
      'Id of the nomination applied for. Preferred over `nomination`: only the id resolves the programs and the duration limits.',
  })
  @IsOptional()
  @IsUUID('4')
  nominationId?: string;

  @ApiPropertyOptional({
    example: 'Solo · Mini Kids · Debut · Free Dance',
    description:
      'Name of an existing nomination. Legacy fallback for clients that do not send `nominationId`; one of the two is required.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nomination?: string;

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
