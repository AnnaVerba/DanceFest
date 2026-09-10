// One entry in the organizer picker's dropdown: an existing account the
// competition can be attributed to, or the current user themselves.
export interface OrganizerOption {
  id: string;
  name: string;
  isSelf: boolean;
}
