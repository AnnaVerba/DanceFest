const WHITESPACE_RUN = /\s+/g;
const SINGLE_SPACE = ' ';
// The locale that decides what lower-case a Ukrainian letter has.
const GROUP_NAME_LOCALE = 'uk';

// Two group names are the same name when they differ only by letter case or
// by stray spaces: «Аміра», « аміра » and «АМІРА  » are one collective.
export function normalizeGroupName(name: string): string {
  return name
    .trim()
    .replace(WHITESPACE_RUN, SINGLE_SPACE)
    .toLocaleLowerCase(GROUP_NAME_LOCALE);
}
