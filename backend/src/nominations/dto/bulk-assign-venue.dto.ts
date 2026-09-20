import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';
import { NominationBulkSelectorDto } from './nomination-bulk-selector.dto';

export class BulkAssignVenueDto extends NominationBulkSelectorDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    description:
      'Venue to put every matched nomination on; null takes them off their venue.',
  })
  @ValidateIf((_dto, value) => value !== null)
  @IsUUID('4')
  venueId: string | null;
}
