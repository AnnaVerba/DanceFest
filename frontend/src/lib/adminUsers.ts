import { apiRequest } from './http';
import { withPageParams } from './pagination';
import type { Paged } from './pagination';
import type {
  AdminUser,
  AdminUserUpdateInput,
  AdminUsersQuery,
} from './adminUsers.types';

export function getAdminUsers(
  query: AdminUsersQuery,
): Promise<Paged<AdminUser>> {
  const params = withPageParams(
    new URLSearchParams(),
    query.page,
    query.pageSize,
  );
  const search = query.search?.trim();
  if (search) params.set('q', search);
  return apiRequest<Paged<AdminUser>>(`/users?${params.toString()}`);
}

export function deleteAdminUser(userId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/users/${userId}`, { method: 'DELETE' });
}

export function updateAdminUser(
  userId: string,
  input: AdminUserUpdateInput,
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
