export const INVITATION_TTL_DAYS = 7;
export const MAX_INVITES_PER_HOUR = 20;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

export const VIEWER_ROLE_OWNER = 'owner';
export const VIEWER_ROLE_ADMIN = 'admin';

export enum InvitationErrorCode {
  ALREADY_MEMBER = 'already-member',
  ALREADY_INVITED = 'already-invited',
  RATE_LIMITED = 'rate-limited',
}

export const ALREADY_MEMBER_MESSAGE = 'Ця людина вже має доступ до конкурсу';
export const ALREADY_INVITED_MESSAGE = 'Запрошення вже надіслано';
export const INVITE_RATE_LIMITED_MESSAGE =
  'Забагато запрошень, спробуйте за годину';
export const INVITATION_NOT_FOUND_MESSAGE = 'Запрошення не знайдено';
export const INVITATION_NOT_ACTIVE_MESSAGE = 'Це запрошення більше не активне';
export const OWNER_NOT_REMOVABLE_MESSAGE =
  'Власника не можна видалити зі списку адміністраторів';
export const ADMIN_NOT_FOUND_MESSAGE = 'Адміністратора не знайдено';
