import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ROUTINE_NAME_MAX_LENGTH } from '../entries.constants';

export class GroupNameCheckQueryDto {
  @ApiProperty({ example: 'Аміра — старша група' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROUTINE_NAME_MAX_LENGTH)
  name: string;
}
