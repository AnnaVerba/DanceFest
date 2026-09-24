import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, ValidateIf } from 'class-validator';
import { MAX_CATEGORY_DESCRIPTION_LENGTH } from '../categories.constants';

export class UpdateCategoryDescriptionDto {
  @ApiProperty({
    example: 'Учасники 18 років і старші',
    nullable: true,
    description: 'Null or an empty string removes the description.',
  })
  @ValidateIf((dto: UpdateCategoryDescriptionDto) => dto.description !== null)
  @IsString()
  @MaxLength(MAX_CATEGORY_DESCRIPTION_LENGTH)
  description: string | null;
}
