import {
  LINEUP_SIZE_FROM_EXCEEDS_TO_MESSAGE,
  LINEUP_SIZE_MUST_BE_INTEGERS_MESSAGE,
  LINEUP_SIZE_REQUIRED_MESSAGE,
  LINEUP_SIZE_TOO_SMALL_MESSAGE,
} from './categoryRange.constants';

/**
 * Чернетка числових меж значення осі. Поля спільні для віку й складу, бо
 * форма вводу однакова; `unbounded` потрібен лише складу — вік без верхньої
 * межі нічого не визначає.
 */
export interface CategoryRangeDraft {
  from: string;
  to: string;
  unbounded: boolean;
}

export interface CategoryRange {
  rangeFrom: number;
  rangeTo: number | null;
}

export const EMPTY_CATEGORY_RANGE: CategoryRangeDraft = {
  from: '',
  to: '',
  unbounded: false,
};

export const MIN_LINEUP_SIZE = 1;

export type CategoryRangeResult =
  | { ok: true; range: CategoryRange }
  | { ok: false; message: string };

/**
 * Кількість людей у складі. Три випадки вводу:
 * - «від» і ✓ «і більше» — верхньої межі немає (Група — троє й більше);
 * - «від» без «до» — рівно стільки (Дуо — двоє);
 * - «від» і «до» — діапазон (Мала група — четверо-семеро).
 */
export function parseLineupSize(draft: CategoryRangeDraft): CategoryRangeResult {
  if (draft.from.trim() === '') {
    return { ok: false, message: LINEUP_SIZE_REQUIRED_MESSAGE };
  }

  const rangeFrom = Number(draft.from);
  if (!Number.isInteger(rangeFrom)) {
    return { ok: false, message: LINEUP_SIZE_MUST_BE_INTEGERS_MESSAGE };
  }
  if (rangeFrom < MIN_LINEUP_SIZE) {
    return { ok: false, message: LINEUP_SIZE_TOO_SMALL_MESSAGE };
  }

  if (draft.unbounded) return { ok: true, range: { rangeFrom, rangeTo: null } };

  // Порожнє «до» — рівно стільки, скільки в «від».
  if (draft.to.trim() === '') {
    return { ok: true, range: { rangeFrom, rangeTo: rangeFrom } };
  }

  const rangeTo = Number(draft.to);
  if (!Number.isInteger(rangeTo)) {
    return { ok: false, message: LINEUP_SIZE_MUST_BE_INTEGERS_MESSAGE };
  }
  if (rangeFrom > rangeTo) {
    return { ok: false, message: LINEUP_SIZE_FROM_EXCEEDS_TO_MESSAGE };
  }

  return { ok: true, range: { rangeFrom, rangeTo } };
}

/** Чи підходить склад під кількість танцюристів у номері. */
export function fitsCount(
  range: { rangeFrom: number | null; rangeTo: number | null },
  count: number,
): boolean {
  if (range.rangeFrom === null) return false;
  if (count < range.rangeFrom) return false;
  return range.rangeTo === null || count <= range.rangeTo;
}

/** Підпис діапазону для чіпа: «2», «4–7», «3 і більше». */
export function formatCategoryRange(
  rangeFrom: number | null,
  rangeTo: number | null,
  unboundedLabel: string,
): string | null {
  if (rangeFrom === null) return null;
  if (rangeTo === null) return `${rangeFrom} ${unboundedLabel}`;
  return rangeFrom === rangeTo ? `${rangeFrom}` : `${rangeFrom}–${rangeTo}`;
}
