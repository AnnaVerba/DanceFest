import { LINEUP_LABELS } from '../entries/lineup';

export const NOMINATION_ID_REQUIRED_MESSAGE = 'Вкажіть nominationId';
export const TARIFF_NOT_FOUND_MESSAGE = 'Тариф перелiмiту не знайдено';
export const DURATION_LIMIT_NOT_FOUND_MESSAGE = 'Ліміт тривалості не знайдено';
export const DURATION_LIMIT_TARGET_REQUIRED_MESSAGE =
  'Задайте рівно одне: nominationId (точна номінація) або categoryId (вісь)';
export const NOMINATION_LIMIT_ALREADY_SET_MESSAGE =
  'Ліміт для цієї номінації й раунду вже задано';
export const AXIS_LIMIT_ALREADY_SET_MESSAGE =
  'Ліміт для цієї осі й раунду вже задано';

// Lineups whose on-stage limit is set per lineup, not per league. Solo keeps
// following the league.
export const LINEUP_LIMIT_LABELS: readonly string[] = [
  LINEUP_LABELS.DUO,
  LINEUP_LABELS.TRIO,
  LINEUP_LABELS.GROUP,
];
