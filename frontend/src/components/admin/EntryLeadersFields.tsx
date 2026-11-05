import SchoolPicker from '../SchoolPicker';
import MentorCoachPicker from '../MentorCoachPicker';
import type { SetMentorCoachBody } from '../../lib/auth';
import {
  CURRENT_LEADERS_LABEL,
  LEADER_LABEL,
  LEADERS_HINT,
  NO_LEADER_VALUE,
} from './EntryLeadersFields.constants';
import styles from './EditForm.module.css';

interface EntryLeadersFieldsProps {
  // The studio and choreographer the entry is filed under now.
  currentStudioName: string;
  currentChoreographer: string;
  studioId: string;
  onStudioChange: (studioId: string) => void;
  onTrainerChange: (trainer: SetMentorCoachBody | null) => void;
}

// The studio and the leader an entry is filed under — picked from the lists,
// as the apply form does. Left alone, the entry keeps the ones it has.
export default function EntryLeadersFields({
  currentStudioName,
  currentChoreographer,
  studioId,
  onStudioChange,
  onTrainerChange,
}: EntryLeadersFieldsProps) {
  return (
    <div className={styles.field}>
      <SchoolPicker value={studioId} onChange={onStudioChange} />
      <span className={styles.label}>{LEADER_LABEL}</span>
      <MentorCoachPicker onChange={onTrainerChange} />
      <p className={styles.hint}>
        {CURRENT_LEADERS_LABEL}: {currentStudioName || NO_LEADER_VALUE} ·{' '}
        {currentChoreographer || NO_LEADER_VALUE}. {LEADERS_HINT}
      </p>
    </div>
  );
}
