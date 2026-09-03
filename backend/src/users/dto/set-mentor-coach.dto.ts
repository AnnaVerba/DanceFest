import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { NewMentorCoachDto } from './new-mentor-coach.dto';

// Exactly one of `coachId` / `newCoach` must be present; the controller
// enforces that and throws MENTOR_COACH_ONE_OF_MESSAGE otherwise.
export class SetMentorCoachDto {
  @ApiProperty({ required: false, description: 'An existing coach id.' })
  @IsOptional()
  @IsUUID()
  coachId?: string;

  @ApiProperty({ required: false, type: NewMentorCoachDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewMentorCoachDto)
  newCoach?: NewMentorCoachDto;
}
