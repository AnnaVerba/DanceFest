import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../application-status.enum';

const DECISIONS = [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED];

export class ReviewOrganizerRequestDto {
  @ApiProperty({ enum: DECISIONS })
  @IsIn(DECISIONS)
  status: ApplicationStatus.APPROVED | ApplicationStatus.REJECTED;

  @ApiProperty({ required: false, description: 'Reason shown on reject.' })
  @IsOptional()
  @IsString()
  decisionNote?: string;
}
