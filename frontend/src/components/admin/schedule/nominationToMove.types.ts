// The nomination block the organizer asked to move, as the editor saw it.
export interface NominationToMove {
  groupKey: string;
  label: string;
  // The day of the section it was picked in — the move dialog opens there.
  dayId: string;
}
