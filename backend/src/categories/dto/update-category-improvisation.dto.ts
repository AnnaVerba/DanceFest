import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCategoryImprovisationDto {
  @ApiProperty({
    example: true,
    description: 'Performances in this style are improvisations everywhere.',
  })
  @IsBoolean()
  isImprovisation: boolean;
}
