// Why a programme row is highlighted for the signed-in viewer: one of their
// own performances, or (for a coach) one of their students'.
export type MineMark = 'mine' | 'student';

// A section's highlight: the strongest mark in it, and each marked nomination
// row by its index in the section's rows.
export interface SectionMarks {
  section: MineMark | null;
  groups: Map<number, MineMark>;
}
