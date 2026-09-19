import type { PluralForms } from '../../../lib/plural';

// Only the pool's total is needed — a one-row page keeps the probe cheap.
export const NEW_ENTRIES_PROBE = { page: 0, pageSize: 1 } as const;

export const NEW_ENTRIES_NOTICE_PREFIX = 'Є';
export const NEW_ENTRIES_NOTICE_FORMS: PluralForms = [
  'нова заявка, не додана у програму',
  'нові заявки, не додані у програму',
  'нових заявок, не доданих у програму',
];
