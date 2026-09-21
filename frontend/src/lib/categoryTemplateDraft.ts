import type { Category } from './categories';
import type { AxisSelection, DraftNomination } from './nominationSet';
import type { AxisPriceMap } from './nominationPricing';

// Only for the "new template" form — an edit already has a saved copy on
// the server, so there is nothing to recover there.
const CATEGORY_TEMPLATE_DRAFT_KEY = 'dansefest.categoryTemplateDraft';

export interface CategoryTemplateDraft {
  name: string;
  description: string;
  isPublic: boolean;
  nominations: DraftNomination[];
  axes: AxisSelection | null;
  axisPrices: AxisPriceMap;
  extraCategories: Category[];
  allMedalLeagues: string[];
}

// A brand-new, untouched form has nothing worth restoring.
function isBlank(draft: CategoryTemplateDraft): boolean {
  return (
    !draft.name.trim() &&
    !draft.description.trim() &&
    draft.nominations.length === 0
  );
}

export function loadCategoryTemplateDraft(): CategoryTemplateDraft | null {
  const raw = localStorage.getItem(CATEGORY_TEMPLATE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CategoryTemplateDraft;
    if (isBlank(parsed)) return null;
    return parsed;
  } catch {
    localStorage.removeItem(CATEGORY_TEMPLATE_DRAFT_KEY);
    return null;
  }
}

export function saveCategoryTemplateDraft(draft: CategoryTemplateDraft): void {
  if (isBlank(draft)) {
    // Nothing worth keeping — and this keeps a cleared form from leaving a
    // stale draft behind for next time.
    localStorage.removeItem(CATEGORY_TEMPLATE_DRAFT_KEY);
    return;
  }
  localStorage.setItem(CATEGORY_TEMPLATE_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCategoryTemplateDraft(): void {
  localStorage.removeItem(CATEGORY_TEMPLATE_DRAFT_KEY);
}
