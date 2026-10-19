// Groups entries that have no trainer (choreographer) or studio set, so
// trainer and studio totals still add up to the competition total.
export const UNSPECIFIED_GROUP_KEY = '__unspecified__';
// The head's own dancers inside a head row's per-trainer breakdown.
export const HEAD_OWN_DANCERS_KEY = '__head__';

export const DEFAULT_FINANCE_PAGE_SIZE = 20;
export const MAX_FINANCE_PAGE_SIZE = 100;

// Only what EntryChargeCalculator and the group keys read.
export const FINANCE_ENTRY_ATTRIBUTES: string[] = [
  'id',
  'createdAt',
  'nominationId',
  'participantIds',
  'participantsCount',
  'extraFee',
  'routineName',
  'trainerId',
  'choreographer',
  'instructorId',
  'instructorName',
  'studioName',
];
