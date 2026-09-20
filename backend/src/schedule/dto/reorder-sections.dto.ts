import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class ReorderSectionsDto {
  @ApiProperty({ description: 'День, у межах якого впорядковуємо відділення.' })
  @IsUUID()
  dayId: string;

  @ApiPropertyOptional({
    description:
      'Майданчик, чию програму дня впорядковуємо. Без нього — відділення без майданчика.',
  })
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiProperty({
    type: [String],
    description:
      'Усі id відділень цього дня й майданчика в новому порядку. Має точно збігатися зі складом.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  sectionIds: string[];
}
