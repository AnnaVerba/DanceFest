import type { CategoryRangeDraft } from './categoryRange';
import {
  AGE_RANGE_REQUIRED_MESSAGE,
  AGE_RANGE_MUST_BE_INTEGERS_MESSAGE,
  AGE_RANGE_MUST_NOT_BE_NEGATIVE_MESSAGE,
  AGE_RANGE_FROM_EXCEEDS_TO_MESSAGE,
} from './ageRange.constants';

export interface AgeRange {
  rangeFrom: number;
  rangeTo: number;
}

export const MIN_AGE_BOUND = 0;

export type AgeRangeResult =
  | { ok: true; range: AgeRange }
  | { ok: false; message: string };

/**
 * Нове вікове значення без меж сервер не прийме: саме з них рахується вікова
 * категорія учасника за датою народження. Перевірка спільна для майстра
 * номінацій і модалки спецкатегорії — розходитись їм не можна.
 */
export function parseAgeRange(draft: CategoryRangeDraft): AgeRangeResult {
  if (draft.from.trim() === '' || draft.to.trim() === '') {
    return { ok: false, message: AGE_RANGE_REQUIRED_MESSAGE };
  }

  const rangeFrom = Number(draft.from);
  const rangeTo = Number(draft.to);

  if (!Number.isInteger(rangeFrom) || !Number.isInteger(rangeTo)) {
    return { ok: false, message: AGE_RANGE_MUST_BE_INTEGERS_MESSAGE };
  }
  if (rangeFrom < MIN_AGE_BOUND || rangeTo < MIN_AGE_BOUND) {
    return { ok: false, message: AGE_RANGE_MUST_NOT_BE_NEGATIVE_MESSAGE };
  }
  if (rangeFrom > rangeTo) {
    return { ok: false, message: AGE_RANGE_FROM_EXCEEDS_TO_MESSAGE };
  }

  return { ok: true, range: { rangeFrom, rangeTo } };
}
