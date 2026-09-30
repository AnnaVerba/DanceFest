import { IntersectionType } from '@nestjs/swagger';
import { AdminUpdateUserDto } from './admin-update-user.dto';
import { SetMentorCoachDto } from './set-mentor-coach.dto';
import { SetSchoolDto } from './set-school.dto';

// An admin editing any user: contacts and access level, plus the school
// (coach level and above) and the mentor coach (an existing one or a new
// one, never both). Only the fields sent change.
export class AdminEditUserDto extends IntersectionType(
  AdminUpdateUserDto,
  SetMentorCoachDto,
  SetSchoolDto,
) {}
