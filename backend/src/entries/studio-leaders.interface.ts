// Whom an entry is filed under: the studio, its head (trainerId /
// choreographer) and, when the dancers train under one of the studio's
// trainers, that trainer (instructorId / instructorName).
export interface StudioLeaders {
  studioId: string | null;
  studioName: string | null;
  trainerId: string | null;
  choreographer: string | null;
  instructorId: string | null;
  instructorName: string | null;
}
