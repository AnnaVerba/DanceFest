// Who a user is in their studio. Kept apart from the access level, so a
// trainer or a head who becomes an organizer still trains or heads the
// same studio.
export enum StudioRole {
  HEAD = 'HEAD',
  TRAINER = 'TRAINER',
}

export const STUDIO_ROLES = [StudioRole.HEAD, StudioRole.TRAINER] as const;
