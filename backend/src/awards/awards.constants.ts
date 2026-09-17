import type { CategoryType } from '../categories/category.model';

// Places that earn a place medal.
export const PRIZE_PLACES_COUNT = 3;
export const FIRST_PLACE_INDEX = 0;
export const SECOND_PLACE_INDEX = 1;
export const THIRD_PLACE_INDEX = 2;

// Outside «медаль кожному» a single performance takes each prize place.
export const PERFORMANCES_PER_TOP_PLACE = 1;
export const NO_PERFORMANCES = 0;

// A group performance is one cup, whatever its place.
export const CUPS_PER_GROUP_PERFORMANCE = 1;
// Every category of a special nomination has exactly one 1st place.
export const WINNERS_PER_SPECIAL_CATEGORY = 1;

export const SPECIAL_NAME_KEY_SEPARATOR = '|';
export const CATEGORY_IDS_SEPARATOR = ',';
export const AWARD_LINE_KEY_SEPARATOR = ':';

export const LINEUP_CATEGORY_TYPE: CategoryType = 'lineup';

// Sanity ceiling for the awards queries, same order as the schedule's cap.
export const MAX_AWARDS_QUERY_ROWS = 5000;

// Manual override bounds.
export const MIN_AWARD_QUANTITY = 0;
export const MAX_AWARD_LINE_KEY_LENGTH = 300;

// Bounds for the organizer's «медаль кожному» league list.
export const MAX_ALL_MEDAL_LEAGUES = 100;
export const MAX_LEAGUE_NAME_LENGTH = 255;
