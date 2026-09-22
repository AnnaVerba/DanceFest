import { useCallback, useMemo, useState } from 'react';
import type { Category, CategoryType } from './categories';
import { EMPTY_CATEGORY_RANGE } from './categoryRange';
import type { CategoryRangeDraft } from './categoryRange';
import {
  CATEGORY_RANGE_FROM_REFERENCE_HINT,
  CATEGORY_RANGE_REFERENCE_EMPTY_HINTS,
} from './categoryRange.hints';
import { sameCategoryValue } from './nominationSet';
import {
  CATEGORY_RANGE_SOURCE_MANUAL,
  CATEGORY_RANGE_SOURCE_REFERENCE,
  CATEGORY_RANGE_SOURCE_REFERENCE_EMPTY,
} from './useCategoryRangeDraft.constants';
import type {
  CategoryRangeDraftController,
  CategoryRangeDraftState,
} from './useCategoryRangeDraft.types';

const INITIAL_STATE: CategoryRangeDraftState = {
  draft: EMPTY_CATEGORY_RANGE,
  source: CATEGORY_RANGE_SOURCE_MANUAL,
};

function findCategory(
  categories: Category[],
  type: CategoryType,
  name: string,
): Category | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const candidate = { name: trimmed, type };
  return categories.find((c) => sameCategoryValue(c, candidate)) ?? null;
}

export function nextCategoryRangeDraft(
  current: CategoryRangeDraftState,
  categories: Category[],
  type: CategoryType,
  name: string,
): CategoryRangeDraftState {
  const known = findCategory(categories, type, name);
  const autoFilled = current.source === CATEGORY_RANGE_SOURCE_REFERENCE;

  if (known && known.rangeFrom !== null) {
    return {
      draft: {
        from: String(known.rangeFrom),
        to: known.rangeTo === null ? '' : String(known.rangeTo),
        unbounded: known.rangeTo === null,
      },
      source: CATEGORY_RANGE_SOURCE_REFERENCE,
    };
  }

  // Значення в довіднику є, але без меж: вікові додали міграцією
  // 20260901090000 без бекфілу, тож давні досі порожні. Підставити нічого —
  // але й змовчати не можна: користувач обрав зі списку й чекає на числа.
  // Введене ним довідник підхопить (`reconcileRange` на бекенді).
  if (known) {
    return {
      draft: autoFilled ? EMPTY_CATEGORY_RANGE : current.draft,
      source: CATEGORY_RANGE_SOURCE_REFERENCE_EMPTY,
    };
  }

  // Введене вручну лишається недоторканим: прибрати можна лише те, що хук сам
  // підставив. Інакше «обрав наявне значення → стер назву → ввів нове» тихо
  // приліпило б до нового чужі межі.
  if (autoFilled) return INITIAL_STATE;
  return { draft: current.draft, source: CATEGORY_RANGE_SOURCE_MANUAL };
}

/**
 * Межі значення осі йдуть за назвою: вибір наявного значення зі списку
 * підтягує його межі, нова назва лишає поля на користувача. Хук спільний для
 * вікової осі й осі складу — форма даних у них однакова, тож і поведінка має
 * бути однакова.
 */
export function useCategoryRangeDraft(
  categories: Category[],
  type: CategoryType,
): CategoryRangeDraftController {
  const [state, setState] = useState<CategoryRangeDraftState>(INITIAL_STATE);

  const setName = useCallback(
    (name: string) =>
      setState((current) =>
        nextCategoryRangeDraft(current, categories, type, name),
      ),
    [categories, type],
  );

  const setDraft = useCallback(
    (next: CategoryRangeDraft) =>
      setState((current) => ({
        draft: next,
        // Ручна правка знімає лише «підставлено з довідника», щоб хук більше
        // не перезаписав введене. Підказка про значення без меж має триматись,
        // поки назва та сама, — інакше пояснення зникає посеред набору.
        source:
          current.source === CATEGORY_RANGE_SOURCE_REFERENCE
            ? CATEGORY_RANGE_SOURCE_MANUAL
            : current.source,
      })),
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const hint = useMemo(() => {
    if (state.source === CATEGORY_RANGE_SOURCE_REFERENCE) {
      return CATEGORY_RANGE_FROM_REFERENCE_HINT;
    }
    if (state.source === CATEGORY_RANGE_SOURCE_REFERENCE_EMPTY) {
      return CATEGORY_RANGE_REFERENCE_EMPTY_HINTS[type] ?? null;
    }
    return null;
  }, [state.source, type]);

  return {
    ...state,
    hint,
    isFromReference: state.source === CATEGORY_RANGE_SOURCE_REFERENCE,
    setName,
    setDraft,
    reset,
  };
}
