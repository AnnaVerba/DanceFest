export const COMPETITION_STATUS = {
  PLANNED: 'Заплановано',
  REGISTRATION_OPEN: 'Реєстрація відкрита',
  REGISTRATION_CLOSED: 'Реєстрація закрита',
  ONGOING: 'Триває',
  FINISHED: 'Завершено',
} as const;

export type CompetitionStatus =
  (typeof COMPETITION_STATUS)[keyof typeof COMPETITION_STATUS];
