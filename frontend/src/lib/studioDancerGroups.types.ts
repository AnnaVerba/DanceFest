import type { StudioDancer } from './participants';

// The dancers one studio trainer trains, as their head sees them.
export interface TrainerDancerGroup {
  trainerId: string;
  trainerName: string | null;
  dancers: StudioDancer[];
}
