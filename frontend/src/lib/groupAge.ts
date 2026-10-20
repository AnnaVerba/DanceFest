import { fitsAge, hasLowerBound } from "./ageEligibility";
import { GROUP_AGE_OTHER_AGE_SHARE } from "./groupAge.constants";
import type { NominationCategoryRange } from "./nominations";

// An open upper bound makes a category as wide as it gets.
function spanOf(category: NominationCategoryRange): number {
  return category.rangeTo === null
    ? Number.POSITIVE_INFINITY
    : category.rangeTo - category.rangeFrom!;
}

// The category a dancer belongs to: of those their age fits, the narrowest —
// so a catch-all «1–17» never claims a dancer a specific category covers.
function ownCategory(
  age: number,
  categories: NominationCategoryRange[],
): NominationCategoryRange | null {
  return categories
    .filter((category) => fitsAge(age, category))
    .reduce<NominationCategoryRange | null>(
      (best, category) =>
        best === null ||
        spanOf(category) < spanOf(best) ||
        (spanOf(category) === spanOf(best) &&
          category.rangeFrom! > best.rangeFrom!)
          ? category
          : best,
      null,
    );
}

function older(
  a: NominationCategoryRange,
  b: NominationCategoryRange,
): NominationCategoryRange {
  return b.rangeFrom! > a.rangeFrom! ? b : a;
}

// The age category a group of named dancers registers in. The group goes into
// the category most of its dancers belong to (the older one when they tie) —
// unless half of the dancers or more are of another age: then the older
// category rules and the group is registered by its eldest dancer.
export function resolveGroupAgeCategory(
  ages: number[],
  categories: NominationCategoryRange[],
): NominationCategoryRange | null {
  const bounded = categories.filter(hasLowerBound);
  const placed = ages.flatMap((age) => {
    const category = ownCategory(age, bounded);
    return category ? [{ age, category }] : [];
  });
  if (placed.length === 0) return null;

  const counts = new Map<
    string,
    { category: NominationCategoryRange; count: number }
  >();
  for (const { category } of placed) {
    const entry = counts.get(category.name) ?? { category, count: 0 };
    entry.count += 1;
    counts.set(category.name, entry);
  }
  const dominant = [...counts.values()].reduce((best, entry) =>
    entry.count > best.count ||
    (entry.count === best.count &&
      older(entry.category, best.category) === entry.category)
      ? entry
      : best,
  );

  const ofOtherAge = (placed.length - dominant.count) / placed.length;
  if (ofOtherAge < GROUP_AGE_OTHER_AGE_SHARE) return dominant.category;

  const eldest = placed.reduce((best, entry) =>
    entry.age > best.age ? entry : best,
  );
  return eldest.category;
}
