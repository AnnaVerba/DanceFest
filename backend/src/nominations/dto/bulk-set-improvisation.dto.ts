import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { NominationBulkSelectorDto } from './nomination-bulk-selector.dto';

export class BulkSetImprovisationDto extends NominationBulkSelectorDto {
  @ApiProperty({
    example: true,
    description: 'Value to apply to every matched nomination.',
  })
  @IsBoolean()
  allowsImprovisation: boolean;
}
