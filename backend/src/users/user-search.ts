import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';

const SEARCHABLE_USER_COLUMNS = ['firstName', 'lastName', 'email', 'phone'];

// The admin user list search: every word must appear in one of the name,
// email or phone columns, so «Іванов Петро» finds that person.
export function userSearchWhere(query?: string): WhereOptions {
  const words = (query ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return {};
  return {
    [Op.and]: words.map((word) => ({
      [Op.or]: SEARCHABLE_USER_COLUMNS.map((column) => ({
        [column]: { [Op.iLike]: `%${word}%` },
      })),
    })),
  };
}
