import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderSectionsDto {
  @ApiProperty({ description: 'День, у межах якого впорядковуємо відділення.' })
  @IsUUID()
  dayId: string;

  @ApiProperty({
    type: [String],
    description:
      'Усі id відділень цього дня в новому порядку. Має точно збігатися зі складом.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  sectionIds: string[];
}
