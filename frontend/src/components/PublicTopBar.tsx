import { Link } from 'react-router-dom';
import { clearSession, getSession } from '../lib/auth';
import { ACCESS_LEVEL_LABELS } from '../lib/roles';
import styles from './PublicTopBar.module.css';

export default function PublicTopBar() {
  const session = getSession();

  const handleLogout = () => {
    clearSession();
    // Hard navigation to the public home: clears every in-memory guard and
    // avoids racing a protected page's own redirect to /login.
    window.location.assign('/');
  };

  return (
    <header className={styles.topbar}>
      <Link to="/" className={styles.brand}>
        <svg
          className={styles.brandIcon}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.1L12 16.3l-6.3 4.4 2.3-7.1-6-4.4h7.6z" />
        </svg>
        <span className={styles.brandName}>Конкурси Сходу</span>
      </Link>

      {session ? (
        <div className={styles.userArea}>
          <Link to="/profile" className={styles.profileBtn} title="Мій профіль">
            <svg
              className={styles.profileIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className={styles.profileText}>
              <span className={styles.userName}>
                {session.profile.firstName}
              </span>
              <span className={styles.userRole}>
                {ACCESS_LEVEL_LABELS[session.profile.accessLevel]}
              </span>
            </span>
          </Link>
          <button
            type="button"
            className={styles.loginBtn}
            onClick={handleLogout}
          >
            Вийти
          </button>
        </div>
      ) : (
        <Link to="/login" className={styles.loginBtn}>
          Увійти
        </Link>
      )}
    </header>
  );
}
