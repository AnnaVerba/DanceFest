import { Navigate, Outlet } from 'react-router-dom';
import { getSession } from '../lib/auth';
import {
  COMPLETE_PROFILE_PATH,
  isProfileCompletionSkipped,
  needsProfileCompletion,
} from '../lib/profileCompletion';

// A signed-in participant who has not picked a mentor coach yet is sent
// to the completion screen before any in-app page renders. A coach skips
// this gate entirely and can add their school/mentor coach from the
// profile screen later.
export default function RequireCompleteProfile() {
  const session = getSession();
  if (
    session &&
    needsProfileCompletion(session.profile) &&
    !isProfileCompletionSkipped()
  ) {
    return <Navigate to={COMPLETE_PROFILE_PATH} replace />;
  }
  return <Outlet />;
}
