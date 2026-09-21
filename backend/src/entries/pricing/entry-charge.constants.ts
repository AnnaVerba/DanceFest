// Everything the charge formula reads from an entry.
export const CHARGE_ENTRY_ATTRIBUTES: string[] = [
  'id',
  'createdAt',
  'nominationId',
  'participantIds',
  'participantsCount',
  'extraFee',
];

// Id prefix of entries that do not exist yet — a quote prices them as if the
// dancers had just submitted them.
export const QUOTE_ROW_ID_PREFIX = 'quote:';
