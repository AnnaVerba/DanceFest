import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
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
  @ApiPropertyOptional({
    example: 'Beautiful Life',
    description:
      'Routine name. Optional when `participantId` is given — the server then uses the participant name.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  routineName?: string;

  @ApiPropertyOptional({
    example: 'e7c1a2b4-5d6f-4a8b-9c0d-1e2f3a4b5c6d',
    description:
      'Single participant the entry is for. Fallback for `participantIds`; a coach may only pass a participant they own.',
  })
  @IsOptional()
  @IsUUID('4')
  participantId?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Every participant in the number — one for a solo, many for a group. The apply form always sends this. A coach may only pass participants they own.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  participantIds?: string[];

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

  @ApiPropertyOptional({
    example: '213_Fesenko_Oriental.mp3',
    description: 'Track file name for this performance.',
  })
  @IsOptional()
  @IsString()
  musicName?: string;
}
