import { Routes, Route } from 'react-router-dom';
import ScreensBar from './components/ScreensBar';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeamPage from './pages/TeamPage';
import PlaceholderPage from './pages/PlaceholderPage';
import './App.css';

function App() {
  return (
    <>
      <ScreensBar />
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

        {/* Екрани зі скрін-бару, які ще не реалізовані */}
        <Route path="/dashboard" element={<PlaceholderPage title="Дашборд" />} />
        <Route
          path="/competitions/new"
          element={<PlaceholderPage title="Новий конкурс" />}
        />
        <Route
          path="/competitions/preview"
          element={<PlaceholderPage title="Перегляд конкурсу" />}
        />
        <Route path="/judge" element={<PlaceholderPage title="Кабінет судді" />} />
        <Route
          path="/apply"
          element={<PlaceholderPage title="Форма заявки (учасник)" />}
        />
        <Route
          path="/category-templates"
          element={<PlaceholderPage title="Шаблони категорій" />}
        />
        <Route
          path="/category-templates/new"
          element={<PlaceholderPage title="Створити шаблон" />}
        />
      </Routes>
    </>
  );
}

export default App;
