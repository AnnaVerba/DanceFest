import { Routes, Route } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import { getToken } from './lib/auth';
import { FEATURES } from './lib/features';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeamPage from './pages/TeamPage';
import DashboardPage from './pages/DashboardPage';
import NewCompetitionPage from './pages/NewCompetitionPage';
import CompetitionEditPage from './pages/CompetitionEditPage';
import CompetitionDetailPage from './pages/CompetitionDetailPage';
import PublicCompetitionPage from './pages/PublicCompetitionPage';
import CompetitionPreviewRedirect from './pages/CompetitionPreviewRedirect';
import JudgePage from './pages/JudgePage';
import ApplyPage from './pages/ApplyPage';
import ParticipantCabinetPage from './pages/ParticipantCabinetPage';
import CategoryTemplatesPage from './pages/CategoryTemplatesPage';
import CategoryTemplateFormPage from './pages/CategoryTemplateFormPage';
import './App.css';

function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/competitions/preview" element={<CompetitionPreviewRedirect />} />
        <Route
          path="/competitions/:id"
          element={
            getToken() ? <CompetitionDetailPage /> : <PublicCompetitionPage />
          }
        />
        <Route path="/competitions/:id/team" element={<TeamPage />} />
        <Route path="/competitions/:id/edit" element={<CompetitionEditPage />} />
        <Route path="/competitions/new" element={<NewCompetitionPage />} />

        {FEATURES.judges && <Route path="/judge" element={<JudgePage />} />}
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/competitions/:id/apply" element={<ApplyPage />} />
        <Route path="/my-entries" element={<ParticipantCabinetPage />} />
        <Route path="/category-templates" element={<CategoryTemplatesPage />} />
        <Route path="/category-templates/new" element={<CategoryTemplateFormPage />} />
        <Route
          path="/category-templates/:id/edit"
          element={<CategoryTemplateFormPage />}
        />
      </Routes>
    </>
  );
}

export default App;
