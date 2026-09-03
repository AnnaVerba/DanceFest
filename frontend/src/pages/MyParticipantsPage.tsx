import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import CoachRoster from '../components/CoachRoster';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL } from '../lib/roles';
import styles from './MyParticipantsPage.module.css';

export default function MyParticipantsPage() {
  const session = getSession();

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }
  if (session.profile.accessLevel !== ACCESS_LEVEL.COACH) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <CabinetLayout>
      <h1 className={styles.title}>Мої учасники</h1>
      <CoachRoster />
    </CabinetLayout>
  );
}
