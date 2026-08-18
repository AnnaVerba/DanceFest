import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeamPage from './pages/TeamPage';
import DashboardPage from './pages/DashboardPage';
import NewCompetitionPage from './pages/NewCompetitionPage';
import CompetitionEditPage from './pages/CompetitionEditPage';
import CompetitionDetailPage from './pages/CompetitionDetailPage';
import CompetitionPreviewRedirect from './pages/CompetitionPreviewRedirect';
import JudgePage from './pages/JudgePage';
import ApplyPage from './pages/ApplyPage';
import CategoryTemplatesPage from './pages/CategoryTemplatesPage';
import NewCategoryTemplatePage from './pages/NewCategoryTemplatePage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Header />
            <HomePage />
          </>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* TODO: обгорнути AuthGuard, коли підключимо реальну авторизацію адмінів */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/competitions/preview" element={<CompetitionPreviewRedirect />} />
      <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
      <Route path="/competitions/:id/team" element={<TeamPage />} />
      <Route path="/competitions/:id/edit" element={<CompetitionEditPage />} />
      <Route path="/competitions/new" element={<NewCompetitionPage />} />

      <Route path="/judge" element={<JudgePage />} />
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/competitions/:id/apply" element={<ApplyPage />} />
      <Route path="/category-templates" element={<CategoryTemplatesPage />} />
      <Route path="/category-templates/new" element={<NewCategoryTemplatePage />} />
    </Routes>
  );
}

export default App;
