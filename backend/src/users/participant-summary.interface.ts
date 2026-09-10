export interface ParticipantSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  hasPassword: boolean;
  coachId: string | null;
  // Resolved from the participant's coach: the choreographer's name and,
  // through that coach, the studio. Null when the participant has no coach
  // (or the coach has no school).
  coachName: string | null;
  studioName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
