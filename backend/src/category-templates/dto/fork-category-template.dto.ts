import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForkCategoryTemplateDto {
  @ApiProperty({
    example: '«Східний танець — стандарт» (моя версія)',
    description: 'Must differ from the source template name.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
