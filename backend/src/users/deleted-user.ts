import { DELETED_CONTACT_SUFFIX } from './users.constants';

// Spread into a `where` to leave soft-deleted users out.
export const NOT_DELETED = { deletedAt: null } as const;

export function markContactDeleted(contact: string, userId: string): string {
  return `${contact}${DELETED_CONTACT_SUFFIX}_${userId}`;
}
