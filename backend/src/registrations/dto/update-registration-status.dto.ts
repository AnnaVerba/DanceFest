import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const STATUSES = ['draft', 'submitted', 'confirmed', 'cancelled'] as const;

export class UpdateRegistrationStatusDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status: (typeof STATUSES)[number];
}
