import type { User } from './user.model';

// Each user once, first occurrence kept — a trainer can be both in the
// head's roster (picked them as mentor) and among the studio's trainers.
export function uniqueById(users: User[]): User[] {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}
