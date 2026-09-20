// One performance of a participant: where and when it runs.
export interface ConflictSlot {
  venueId: string;
  sectionName: string;
  time: string;
  routineName: string;
}

// One performance of one participant on the running clock (seconds).
export interface ParticipantSlot extends ConflictSlot {
  participantNumber: number | null;
  dayId: string;
  start: number;
  end: number;
}

// A participant booked on two venues at overlapping times on one day.
export interface VenueConflictView {
  participantNumber: number | null;
  dayId: string;
  first: ConflictSlot;
  second: ConflictSlot;
}
