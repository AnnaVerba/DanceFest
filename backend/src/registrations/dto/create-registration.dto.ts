import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PersonInputDto } from './person-input.dto';

const MAX_PARTICIPANTS_PER_REGISTRATION = 30;

export class CreateRegistrationDto {
  @ApiProperty({ example: 'a3f1c2d4-...' })
  @IsUUID()
  nominationId: string;

  @ApiPropertyOptional({ example: 'Beautiful Life' })
  @IsOptional()
  @IsString()
  routineName?: string;

  @ApiPropertyOptional({ type: PersonInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonInputDto)
  coach?: PersonInputDto;

  @ApiPropertyOptional({ type: PersonInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonInputDto)
  submittedBy?: PersonInputDto;

  @ApiPropertyOptional({ example: 'Анна Луцкевич' })
  @IsOptional()
  @IsString()
  choreographer?: string;

  @ApiPropertyOptional({ example: 'StarFamily' })
  @IsOptional()
  @IsString()
  studioName?: string;

  @ApiPropertyOptional({ example: 'Львів' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  improv?: boolean;

  @ApiProperty({ type: [PersonInputDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PARTICIPANTS_PER_REGISTRATION)
  @ValidateNested({ each: true })
  @Type(() => PersonInputDto)
  participants: PersonInputDto[];
}
