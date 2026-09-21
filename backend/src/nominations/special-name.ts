import {
  SPECIAL_GROUP_KEY_SEPARATOR,
  SPECIAL_NAME_WHITESPACE_PATTERN,
} from './nominations.constants';

export function normalizeSpecialName(raw: string): string {
  return raw.trim().replace(SPECIAL_NAME_WHITESPACE_PATTERN, ' ');
}

// Case-insensitive on purpose, and done here rather than with SQL lower():
// its result depends on the database's locale.
export function specialNameLookupKey(raw: string): string {
  return normalizeSpecialName(raw).toLocaleLowerCase();
}

export function specialGroupKey(
  competitionId: string,
  specialName: string,
): string {
  return `${competitionId}${SPECIAL_GROUP_KEY_SEPARATOR}${specialName}`;
}
