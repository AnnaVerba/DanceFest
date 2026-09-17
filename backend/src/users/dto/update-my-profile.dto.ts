import {
  ApiPropertyOptional,
  IntersectionType,
  PickType,
} from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { AdminUpdateUserDto } from './admin-update-user.dto';
import { SetMentorCoachDto } from './set-mentor-coach.dto';

// A user editing their own profile: the admin edit's contact fields minus
// phone (it is the login) and access level, plus the mentor coach (an
// existing one or a new one, never both) and, for a coach, the school.
// Only the fields sent change.
export class UpdateMyProfileDto extends IntersectionType(
  PickType(AdminUpdateUserDto, [
    'firstName',
    'lastName',
    'email',
    'birthDate',
  ] as const),
  SetMentorCoachDto,
) {
  @ApiPropertyOptional({ description: 'Coach level and above only.' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
