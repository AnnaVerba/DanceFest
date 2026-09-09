import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { SetMentorCoachDto } from './set-mentor-coach.dto';

// Mentor-coach choice (from SetMentorCoachDto) plus the school a coach
// works at. `schoolId` is required only when the caller is a COACH; the
// service enforces that so the message can be specific.
export class CompleteProfileDto extends SetMentorCoachDto {
  @ApiProperty({
    required: false,
    description: 'Required when the caller is a coach.',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
