import { AGE_CATEGORY_TYPE } from './categories';
import type { Category, CategoryType } from './categories';
import { parseAgeRange } from './ageRange';
import { parseLineupSize } from './categoryRange';
import type { CategoryRange } from './categoryRange';
import { draftCategory, sameCategoryValue } from './nominationSet';
import type { CategoryRangeDraftController } from './useCategoryRangeDraft.types';
import type { AxisValueResult } from './axisValue.types';

/**
 * Довідник спільний за назвою: якщо значення з такою назвою вже є,
 * порожні поля меж означають «використати наявне», а заповнені — намір
 * користувача або підтвердити, або перевизначити їх. Тихо відкидати
 * введене й підставляти чуже — саме той сценарій, що ламав BUG-03.
 *
 * Підставлене з довідника й не редаговане — це не введені межі: інакше
 * вибір наявного значення щоразу створював би чернетку замість нього
 * самого, і ✎ на чіпі правив би лише набір, а не спільний довідник.
 *
 * `rangeDraft` — null для осей без числових меж.
 */
export function resolveAxisValue(
  name: string,
  type: CategoryType,
  suggestions: Category[],
  rangeDraft: CategoryRangeDraftController | null,
): AxisValueResult {
  const raw = name.trim();
  const existing = suggestions.find((s) => sameCategoryValue(s, { name: raw, type }));

  let range: CategoryRange | undefined;
  if (rangeDraft) {
    const rangeEntered =
      !rangeDraft.isFromReference &&
      (rangeDraft.draft.from.trim() !== '' || rangeDraft.draft.to.trim() !== '');
    // Кількість людей обов'язкова для нового складу: без неї він не знає,
    // скільком танцюристам відповідає, і заявка його не підбере.
    if (!existing || rangeEntered || rangeDraft.draft.unbounded) {
      const parsed =
        type === AGE_CATEGORY_TYPE
          ? parseAgeRange(rangeDraft.draft)
          : parseLineupSize(rangeDraft.draft);
      if (!parsed.ok) return { ok: false, message: parsed.message };
      range = parsed.range;
    }
  }

  return {
    ok: true,
    category: existing && !range ? existing : draftCategory(raw, type, range),
  };
}
