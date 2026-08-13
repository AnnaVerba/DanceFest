import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeamPage from './pages/TeamPage';
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
      <Route path="/competitions/:id/team" element={<TeamPage />} />
    </Routes>
  );
}

export default App;
