import { ParticipantSummary } from './participant-summary.interface';

// A dancer one of the studio's trainers trains, as their studio head sees
// them — read-only, with the trainer's name.
export interface StudioDancerSummary extends ParticipantSummary {
  trainerId: string | null;
  trainerName: string | null;
}
