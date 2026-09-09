import { PlaceholderCoachData } from './placeholder-coach.data';

// A "pick an existing coach or describe a new one" choice. Exactly one
// side must be set.
export interface MentorCoachSelection {
  coachId?: string;
  newCoach?: PlaceholderCoachData;
}
