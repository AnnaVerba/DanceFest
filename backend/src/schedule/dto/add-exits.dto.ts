import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AddExitsDto {
  @ApiProperty({
    type: [String],
    description: 'Нерозподілені виходи (entries), які додаємо у відділення.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  entryIds: string[];
}
