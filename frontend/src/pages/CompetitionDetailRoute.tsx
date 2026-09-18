import CompetitionDetailPage from './CompetitionDetailPage';
import PublicCompetitionPage from './PublicCompetitionPage';
import { getToken } from '../lib/auth';

// `getToken()` reads localStorage directly, so the choice below must be
// made inside a component's own render (re-evaluated every time this route
// renders) rather than inlined in App's JSX — there it would run once, at
// App's first render, and never pick up a login that happens afterwards
// without a full page reload.
export default function CompetitionDetailRoute() {
  return getToken() ? <CompetitionDetailPage /> : <PublicCompetitionPage />;
}
