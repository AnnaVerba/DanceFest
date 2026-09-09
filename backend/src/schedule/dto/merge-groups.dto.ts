import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class MergeGroupsDto {
  @ApiProperty({
    type: [String],
    description: 'Ключі груп номінацій, які обʼєднуємо для показу.',
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  groupKeys: string[];

  @ApiProperty({ example: 'Юніори 1 + Юніори 2' })
  @IsString()
  @MinLength(1)
  label: string;
}
