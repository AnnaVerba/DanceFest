import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getStoredAdmin } from '../lib/auth';
import styles from './AdminHeader.module.css';

export default function AdminHeader() {
  const navigate = useNavigate();
  const admin = getStoredAdmin();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/dashboard" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
              <path d="M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10" />
              <path d="M12 14v3M9 20h6M10 17h4" />
            </svg>
          </span>
          <span className={styles.brandName}>CompAdmin</span>
        </NavLink>

        <nav className={styles.nav}>
          <NavLink to="/dashboard" className={navLinkClass}>
            Конкурси
          </NavLink>
          <NavLink to="/category-templates" className={navLinkClass}>
            Шаблони категорій
          </NavLink>
          {admin && <span className={styles.email}>{admin.email}</span>}
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Вийти
          </button>
        </nav>
      </div>
    </header>
  );
}
