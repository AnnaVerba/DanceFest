export interface ParticipantSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  hasPassword: boolean;
  coachId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
