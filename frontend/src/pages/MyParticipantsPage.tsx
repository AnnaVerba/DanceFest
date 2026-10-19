import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import CoachRoster from '../components/CoachRoster';
import StudioTrainersRoster from '../components/StudioTrainersRoster';
import { getSession, getToken } from '../lib/auth';
import { hasStudioRole, isStudioHead } from '../lib/roles';
import styles from './MyParticipantsPage.module.css';

export default function MyParticipantsPage() {
  const session = getSession();

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }
  if (!hasStudioRole(session.profile)) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <CabinetLayout>
      <h1 className={styles.title}>Мої учасники</h1>
      <CoachRoster />
      {isStudioHead(session.profile) && (
        <div className={styles.studioRoster}>
          <StudioTrainersRoster />
        </div>
      )}
    </CabinetLayout>
  );
}
