// Every nomination must carry a league: the apply form files each entry
// under one, so a league-less nomination could never be applied to.
export const NOMINATION_LEAGUE_REQUIRED_MESSAGE =
  'Кожна номінація повинна мати лігу. Без ліги';
export const SPECIAL_LEAGUE_REQUIRED_MESSAGE = 'Оберіть хоча б одну лігу.';
export const NOMINATION_LEAGUE_SELECT_REQUIRED_MESSAGE =
  'Оберіть лігу номінації.';
export const NOMINATION_LEAGUE_PLACEHOLDER = 'Ліга…';
export const NOMINATION_LEAGUE_ARIA_LABEL = 'Ліга номінації';
export const COMPETITION_NOMINATIONS_REQUIRED_MESSAGE =
  'Конкурс не можна створити без номінацій — оберіть шаблон, у якому вони є.';

// The error lists this many league-less nominations before cutting off.
export const MAX_LISTED_NOMINATIONS = 5;
export const LISTED_NOMINATIONS_SEPARATOR = ', ';
export const LISTED_NOMINATIONS_ELLIPSIS = '…';
