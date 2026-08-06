import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
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
    </Routes>
  );
}

export default App;
