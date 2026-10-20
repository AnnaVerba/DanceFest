// The apply form's two ways to register: a solo, duo or trio by named
// dancers, or a group (a collective) by headcount or by named dancers.
export const APPLY_TAB = {
  INDIVIDUAL: 'individual',
  GROUP: 'group',
} as const;

export const APPLY_TAB_LABEL = {
  [APPLY_TAB.INDIVIDUAL]: 'Соло / Дуо / Тріо',
  [APPLY_TAB.GROUP]: 'Група',
} as const;

export const APPLY_TABS_ARIA_LABEL = 'Тип заявки';

// Solo, duo and trio — a fourth dancer makes a group, registered on its own tab.
export const INDIVIDUAL_MAX_PARTICIPANTS = 3;
export const INDIVIDUAL_MAX_PARTICIPANTS_MESSAGE = `Максимум ${INDIVIDUAL_MAX_PARTICIPANTS} учасники.`;
