import { Navigate, Outlet } from 'react-router-dom';
import { getSession } from '../lib/auth';
import {
  COMPLETE_PROFILE_PATH,
  needsProfileCompletion,
} from '../lib/profileCompletion';

// A signed-in participant or coach who has not supplied their mandatory
// fields (coach for everyone, plus school for a coach) is sent to the
// completion screen before any in-app page renders.
export default function RequireCompleteProfile() {
  const session = getSession();
  if (session && needsProfileCompletion(session.profile)) {
    return <Navigate to={COMPLETE_PROFILE_PATH} replace />;
  }
  return <Outlet />;
}
