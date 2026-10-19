// Who a user is in their studio — kept apart from the access level, so a
// trainer or a head who becomes an organizer still trains / heads (TASK-16).
export const STUDIO_ROLE = {
  HEAD: 'HEAD',
  TRAINER: 'TRAINER',
} as const;

export const STUDIO_ROLE_LABELS = {
  HEAD: 'Керівник',
  TRAINER: 'Тренер',
} as const;

// «Тренер · Організатор» — a studio role shown together with the level.
export const ROLE_LABEL_JOINER = ' · ';
