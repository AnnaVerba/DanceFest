import { Competition } from './competition.model';

// True for an account named in the competition's organizers field. Such an
// account also needs a team membership (see CompetitionsService) to act.
export function isListedOrganizer(
  competition: Competition,
  userId: string,
): boolean {
  return competition.organizerIds.includes(userId);
}
