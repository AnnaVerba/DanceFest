import { useCallback, useMemo, useState } from 'react';
import { AGE_CATEGORY_TYPE } from './categories';
import type { Category } from './categories';
import { EMPTY_AGE_RANGE } from './ageRange';
import type { AgeRangeDraft } from './ageRange';
import {
  AGE_RANGE_FROM_REFERENCE_HINT,
  AGE_RANGE_REFERENCE_EMPTY_HINT,
} from './ageRange.constants';
import { sameCategoryValue } from './nominationSet';
import {
  AGE_RANGE_SOURCE_MANUAL,
  AGE_RANGE_SOURCE_REFERENCE,
  AGE_RANGE_SOURCE_REFERENCE_EMPTY,
} from './useAgeRangeDraft.constants';
import type {
  AgeRangeDraftController,
  AgeRangeDraftState,
} from './useAgeRangeDraft.types';

const INITIAL_STATE: AgeRangeDraftState = {
  draft: EMPTY_AGE_RANGE,
  source: AGE_RANGE_SOURCE_MANUAL,
};

const HINTS: Record<string, string | null> = {
  [AGE_RANGE_SOURCE_MANUAL]: null,
  [AGE_RANGE_SOURCE_REFERENCE]: AGE_RANGE_FROM_REFERENCE_HINT,
  [AGE_RANGE_SOURCE_REFERENCE_EMPTY]: AGE_RANGE_REFERENCE_EMPTY_HINT,
};

function findAgeCategory(categories: Category[], name: string): Category | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const candidate = { name: trimmed, type: AGE_CATEGORY_TYPE };
  return categories.find((c) => sameCategoryValue(c, candidate)) ?? null;
}

export function nextAgeRangeDraft(
  current: AgeRangeDraftState,
  categories: Category[],
  name: string,
): AgeRangeDraftState {
  const known = findAgeCategory(categories, name);
  const autoFilled = current.source === AGE_RANGE_SOURCE_REFERENCE;

  if (known && known.ageFrom !== null && known.ageTo !== null) {
    return {
      draft: { from: String(known.ageFrom), to: String(known.ageTo) },
      source: AGE_RANGE_SOURCE_REFERENCE,
    };
  }

  // Категорія в довіднику є, але без меж: `ageFrom`/`ageTo` додали міграцією
  // 20260901090000 без бекфілу, тож давні значення досі порожні. Підставити
  // нічого — але й змовчати не можна: користувач обрав зі списку й чекає на
  // числа. Введене ним довідник підхопить (`reconcileAgeRange` на бекенді).
  if (known) {
    return {
      draft: autoFilled ? EMPTY_AGE_RANGE : current.draft,
      source: AGE_RANGE_SOURCE_REFERENCE_EMPTY,
    };
  }

  // Введене вручну лишається недоторканим: прибрати можна лише те, що хук сам
  // підставив. Інакше «обрав наявну категорію → стер назву → ввів нову» тихо
  // приліпило б до нової категорії чужі межі.
  if (autoFilled) return INITIAL_STATE;
  return { draft: current.draft, source: AGE_RANGE_SOURCE_MANUAL };
}

/**
 * Межі віку йдуть за назвою: вибір наявної вікової категорії зі списку
 * підтягує її «від» і «до», нова назва лишає поля на користувача. Хук спільний
 * для майстра номінацій і модалки спецкатегорії — розходитись їм не можна.
 */
export function useAgeRangeDraft(categories: Category[]): AgeRangeDraftController {
  const [state, setState] = useState<AgeRangeDraftState>(INITIAL_STATE);

  const setName = useCallback(
    (name: string) =>
      setState((current) => nextAgeRangeDraft(current, categories, name)),
    [categories],
  );

  const setDraft = useCallback(
    (next: AgeRangeDraft) =>
      setState((current) => ({
        draft: next,
        // Ручна правка знімає лише «підставлено з довідника», щоб хук більше
        // не перезаписав введене. Підказка про категорію без меж має триматись,
        // поки назва та сама, — інакше пояснення зникає посеред набору.
        source:
          current.source === AGE_RANGE_SOURCE_REFERENCE
            ? AGE_RANGE_SOURCE_MANUAL
            : current.source,
      })),
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const hint = useMemo(() => HINTS[state.source] ?? null, [state.source]);

  return {
    ...state,
    hint,
    isFromReference: state.source === AGE_RANGE_SOURCE_REFERENCE,
    setName,
    setDraft,
    reset,
  };
}
