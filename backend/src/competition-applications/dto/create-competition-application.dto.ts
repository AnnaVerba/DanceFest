import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCompetitionApplicationDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  @IsNotEmpty()
  competitionId: string;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  @IsNotEmpty()
  leagueId: string;

  @ApiProperty({
    description:
      'Required when the caller is a coach; ignored for a participant.',
    example: 'a1b2c3d4-...',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  participantId?: string;
}
