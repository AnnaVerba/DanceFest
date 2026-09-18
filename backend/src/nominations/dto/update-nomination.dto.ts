import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateNominationDto } from './create-nomination.dto';

export class UpdateNominationDto extends PartialType(CreateNominationDto) {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Venue the nomination is danced on; null takes it off its venue.',
  })
  @IsOptional()
  @IsUUID('4')
  venueId?: string | null;
}
