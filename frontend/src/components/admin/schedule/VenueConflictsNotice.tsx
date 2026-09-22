import type { Venue } from '../../../lib/venues';
import type {
  ConflictSlot,
  VenueConflict,
} from '../../../lib/venueConflict.types';
import { formatClock } from '../../../lib/duration';
import {
  CONFLICT_PAIR_SEPARATOR,
  CONFLICT_UNKNOWN_NUMBER,
  VENUE_CONFLICTS_TITLE,
} from './venueConflictsNotice.constants';
import { PARTICIPANT_NUMBER_MARK } from '../../../lib/programNumbers.constants';
import styles from './program.module.css';

interface VenueConflictsNoticeProps {
  conflicts: VenueConflict[];
  venues: Venue[];
}

// A dancer cannot be on two stages at once — after moving a nomination to
// another venue the organizer sees who now overlaps (TASK-14).
export default function VenueConflictsNotice({
  conflicts,
  venues,
}: VenueConflictsNoticeProps) {
  const venueName = new Map(venues.map((venue) => [venue.id, venue.name]));
  const slotText = (slot: ConflictSlot) =>
    `«${venueName.get(slot.venueId) ?? slot.venueId}» ${formatClock(slot.time)} ${slot.routineName}`;

  return (
    <div className={styles.warnLine} role="alert">
      {VENUE_CONFLICTS_TITLE}
      <ul className={styles.conflictList}>
        {conflicts.map((conflict, index) => (
          <li key={index}>
            {PARTICIPANT_NUMBER_MARK}
            {conflict.participantNumber ?? CONFLICT_UNKNOWN_NUMBER}:{' '}
            {slotText(conflict.first)}
            {CONFLICT_PAIR_SEPARATOR}
            {slotText(conflict.second)}
          </li>
        ))}
      </ul>
    </div>
  );
}
