import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';

export const PARTICIPANT_SEARCH_MIN_CHARS = 3;
export const PARTICIPANT_SEARCH_LIMIT = 25;

// Case-insensitive "name contains" over firstName / lastName. Returns an
// empty clause for a missing / too-short query — the caller decides
// whether to run the query at all.
export function nameWhere(query?: string): WhereOptions {
  const q = query?.trim();
  if (!q || q.length < PARTICIPANT_SEARCH_MIN_CHARS) return {};
  const like = { [Op.iLike]: `%${q}%` };
  return { [Op.or]: [{ firstName: like }, { lastName: like }] };
}
