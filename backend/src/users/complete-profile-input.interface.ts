import { MentorCoachSelection } from './mentor-coach-selection.interface';

// What `UsersService.completeProfile` needs: a mentor-coach choice plus,
// for a coach, the school they work at.
export interface CompleteProfileInput extends MentorCoachSelection {
  schoolId?: string;
}
