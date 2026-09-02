export interface AgeRangeDraft {
  from: string;
  to: string;
}

export interface AgeRange {
  ageFrom: number;
  ageTo: number;
}

export const EMPTY_AGE_RANGE: AgeRangeDraft = { from: '', to: '' };

export const MIN_AGE_BOUND = 0;

export type AgeRangeResult =
  | { ok: true; range: AgeRange }
  | { ok: false; message: string };

/**
 * Нове вікове значення без меж сервер не прийме: саме з них рахується вікова
 * категорія учасника за датою народження. Перевірка спільна для майстра
 * номінацій і модалки спецкатегорії — розходитись їм не можна.
 */
export function parseAgeRange(draft: AgeRangeDraft): AgeRangeResult {
  if (draft.from.trim() === '' || draft.to.trim() === '') {
    return { ok: false, message: 'Вкажіть межі віку — від і до.' };
  }

  const ageFrom = Number(draft.from);
  const ageTo = Number(draft.to);

  if (!Number.isInteger(ageFrom) || !Number.isInteger(ageTo)) {
    return { ok: false, message: 'Межі віку мають бути цілими числами.' };
  }
  if (ageFrom < MIN_AGE_BOUND || ageTo < MIN_AGE_BOUND) {
    return { ok: false, message: 'Межі віку не можуть бути відʼємними.' };
  }
  if (ageFrom > ageTo) {
    return { ok: false, message: 'Нижня межа віку більша за верхню.' };
  }

  return { ok: true, range: { ageFrom, ageTo } };
}
