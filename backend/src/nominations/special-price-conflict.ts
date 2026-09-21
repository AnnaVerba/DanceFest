import {
  SPECIAL_PRICE_CONFLICT_MESSAGE_TEMPLATE,
  SPECIAL_PRICE_CONFLICT_NAME_PLACEHOLDER,
  SPECIAL_PRICE_CONFLICT_PRICE_PLACEHOLDER,
} from './nominations.constants';

export function specialPriceConflictMessage(
  specialName: string,
  groupPrice: number,
): string {
  return SPECIAL_PRICE_CONFLICT_MESSAGE_TEMPLATE.replace(
    SPECIAL_PRICE_CONFLICT_NAME_PLACEHOLDER,
    specialName,
  ).replace(SPECIAL_PRICE_CONFLICT_PRICE_PLACEHOLDER, String(groupPrice));
}
