import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrganizerRequestDto {
  @ApiProperty({ description: 'School the applicant will organize under.' })
  @IsUUID()
  schoolId: string;

  @ApiProperty({ required: false, description: 'Motivation, optional.' })
  @IsOptional()
  @IsString()
  note?: string;
}
