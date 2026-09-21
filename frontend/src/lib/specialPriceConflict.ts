import type { DraftNomination } from './nominationSet';
import { NominationApiError } from './nominations';
import { SPECIAL_PRICE_CONFLICT_CODE } from './nominations.constants';
import {
  DRAFT_SET_PRICE_CONFLICT_TEMPLATE,
  SPECIAL_CONFLICT_NAME_PLACEHOLDER,
  SPECIAL_CONFLICT_PRICE_PLACEHOLDER,
  SPECIAL_NAME_WHITESPACE_PATTERN,
} from './specialPriceConflict.constants';

type PricedSpecial = Pick<DraftNomination, 'isSpecial' | 'specialName' | 'price'>;

// Same comparison as the server's: spaces and letter case do not make a
// different name.
function nameKey(specialName: string): string {
  return specialName
    .trim()
    .replace(SPECIAL_NAME_WHITESPACE_PATTERN, ' ')
    .toLocaleLowerCase();
}

// One price per special name: a draft that names an already-priced special
// with another price would silently reprice the whole group. An empty price
// inherits the group's, so it never conflicts.
export function findDraftPriceConflict(
  existing: PricedSpecial[],
  incoming: PricedSpecial[],
): string | null {
  const pricedByName = new Map<string, PricedSpecial>();
  for (const draft of existing) {
    if (!draft.isSpecial || !draft.specialName || draft.price.trim() === '') continue;
    const key = nameKey(draft.specialName);
    if (!pricedByName.has(key)) pricedByName.set(key, draft);
  }

  for (const draft of incoming) {
    if (!draft.isSpecial || !draft.specialName || draft.price.trim() === '') continue;
    const known = pricedByName.get(nameKey(draft.specialName));
    if (known && Number(known.price) !== Number(draft.price)) {
      return DRAFT_SET_PRICE_CONFLICT_TEMPLATE.replace(
        SPECIAL_CONFLICT_NAME_PLACEHOLDER,
        known.specialName as string,
      ).replace(SPECIAL_CONFLICT_PRICE_PLACEHOLDER, String(Number(known.price)));
    }
  }
  return null;
}

// The server refuses a special nomination whose price differs from its
// name's; the text is already Ukrainian and names the existing price.
export function serverPriceConflictMessage(error: unknown): string | null {
  return error instanceof NominationApiError &&
    error.code === SPECIAL_PRICE_CONFLICT_CODE
    ? error.message
    : null;
}
