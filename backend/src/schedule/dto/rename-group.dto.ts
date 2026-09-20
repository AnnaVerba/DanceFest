import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RenameGroupDto {
  @ApiProperty({ example: 'Юніори 1 + Юніори 2' })
  @IsString()
  @MinLength(1)
  label: string;
}
