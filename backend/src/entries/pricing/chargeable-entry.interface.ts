// The slice of an entry the charge formula reads.
export interface ChargeableEntry {
  id: string;
  createdAt: Date;
  nominationId: string | null;
  participantIds: string[] | null;
  participantsCount: number | null;
  extraFee: number | string;
}
