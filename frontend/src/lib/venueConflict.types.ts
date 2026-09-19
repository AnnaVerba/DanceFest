// One performance of a participant: where and when it runs.
export interface ConflictSlot {
  venueId: string;
  sectionName: string;
  time: string;
  routineName: string;
}

// A participant booked on two venues at overlapping times on one day.
export interface VenueConflict {
  participantNumber: number | null;
  dayId: string;
  first: ConflictSlot;
  second: ConflictSlot;
}
