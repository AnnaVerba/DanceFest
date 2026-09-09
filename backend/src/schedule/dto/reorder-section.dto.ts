import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderSectionDto {
  @ApiProperty({
    type: [String],
    description:
      'Усі id позицій відділення у новому порядку. Має точно збігатися зі складом.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  itemIds: string[];
}
