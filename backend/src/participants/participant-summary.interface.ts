export interface ParticipantSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  coachId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
