import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import AppShell from './components/AppShell';
import RequireCompleteProfile from './components/RequireCompleteProfile';
import { getToken } from './lib/auth';
import { FEATURES } from './lib/features';
// The two cold-entry screens load eagerly; every other page is a separate
// chunk fetched on first navigation, so the initial bundle stays small.
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CompetitionPreviewRedirect from './pages/CompetitionPreviewRedirect';
import './App.css';

const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const NewCompetitionPage = lazy(() => import('./pages/NewCompetitionPage'));
const CompetitionEditPage = lazy(() => import('./pages/CompetitionEditPage'));
const CompetitionDetailPage = lazy(
  () => import('./pages/CompetitionDetailPage'),
);
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const CompetitionEntriesPage = lazy(
  () => import('./pages/CompetitionEntriesPage'),
);
const PublicCompetitionPage = lazy(
  () => import('./pages/PublicCompetitionPage'),
);
const JudgePage = lazy(() => import('./pages/JudgePage'));
const ApplyPage = lazy(() => import('./pages/ApplyPage'));
const ParticipantCabinetPage = lazy(
  () => import('./pages/ParticipantCabinetPage'),
);
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const MyParticipantsPage = lazy(() => import('./pages/MyParticipantsPage'));
const OrganizerRequestsPage = lazy(
  () => import('./pages/OrganizerRequestsPage'),
);
const CategoryTemplatesPage = lazy(
  () => import('./pages/CategoryTemplatesPage'),
);
const CategoryTemplateFormPage = lazy(
  () => import('./pages/CategoryTemplateFormPage'),
);

function App() {
  return (
    <>
      <ThemeToggle />
      <Suspense fallback={<div style={{ padding: 24 }}>Завантаження…</div>}>
      <Routes>
        {/* Auth screens stand alone — no shared chrome. */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        {FEATURES.judges && <Route path="/judge" element={<JudgePage />} />}
        <Route
          path="/competitions/preview"
          element={<CompetitionPreviewRedirect />}
        />

        {/* Everything else shares the top bar. A signed-in participant or
            coach with an unfinished profile is bounced to /complete-profile. */}
        <Route element={<RequireCompleteProfile />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/competitions/:id"
            element={
              getToken() ? <CompetitionDetailPage /> : <PublicCompetitionPage />
            }
          />
          <Route
            path="/competitions/:id/schedule"
            element={<SchedulePage />}
          />
          <Route
            path="/competitions/:id/entries"
            element={<CompetitionEntriesPage />}
          />
          <Route path="/competitions/:id/team" element={<TeamPage />} />
          <Route
            path="/competitions/:id/edit"
            element={<CompetitionEditPage />}
          />
          <Route path="/competitions/new" element={<NewCompetitionPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/competitions/:id/apply" element={<ApplyPage />} />
          <Route path="/my-entries" element={<ParticipantCabinetPage />} />
          <Route path="/my-participants" element={<MyParticipantsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/organizer-requests" element={<OrganizerRequestsPage />} />
          <Route
            path="/category-templates"
            element={<CategoryTemplatesPage />}
          />
          <Route
            path="/category-templates/new"
            element={<CategoryTemplateFormPage />}
          />
          <Route
            path="/category-templates/:id/edit"
            element={<CategoryTemplateFormPage />}
          />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}

export default App;
