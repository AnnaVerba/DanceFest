import { fitsAge, hasLowerBound } from './ageEligibility';
import { GROUP_AGE_MAJORITY_SHARE } from './groupAge.constants';
import type { NominationCategoryRange } from './nominations';

function oldest(
  categories: NominationCategoryRange[],
): NominationCategoryRange | null {
  return categories.reduce<NominationCategoryRange | null>(
    (best, category) =>
      best === null || category.rangeFrom! > best.rangeFrom! ? category : best,
    null,
  );
}

// The age category a group of named dancers registers in. A category counts
// once half of the dancers or more fit it: a lone adult among teenagers does
// not move the group out of the teenagers' category. When several categories
// count — a group of Mini Kids and Kids, half and half — the older one rules.
// A group split so that no category holds half registers by its eldest dancer.
export function resolveGroupAgeCategory(
  ages: number[],
  categories: NominationCategoryRange[],
): NominationCategoryRange | null {
  if (ages.length === 0) return null;
  const bounded = categories.filter(hasLowerBound);

  const holdingHalf = bounded.filter((category) => {
    const fitting = ages.filter((age) => fitsAge(age, category)).length;
    return fitting / ages.length >= GROUP_AGE_MAJORITY_SHARE;
  });
  if (holdingHalf.length > 0) return oldest(holdingHalf);

  const eldest = Math.max(...ages);
  return oldest(bounded.filter((category) => fitsAge(eldest, category)));
}
