import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import CoachRoster from '../components/CoachRoster';
import StudioTrainersRoster from '../components/StudioTrainersRoster';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL, isStudioStaff } from '../lib/roles';
import styles from './MyParticipantsPage.module.css';

export default function MyParticipantsPage() {
  const session = getSession();

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }
  if (!isStudioStaff(session.profile.accessLevel)) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <CabinetLayout>
      <h1 className={styles.title}>Мої учасники</h1>
      <CoachRoster />
      {session.profile.accessLevel === ACCESS_LEVEL.COACH && (
        <div className={styles.studioRoster}>
          <StudioTrainersRoster />
        </div>
      )}
    </CabinetLayout>
  );
}
