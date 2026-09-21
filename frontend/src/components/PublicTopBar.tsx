import { Link, useLocation } from 'react-router-dom';
import { clearSession, getSession } from '../lib/auth';
import { ACCESS_LEVEL_LABELS } from '../lib/roles';
import { HOME_PATH } from './PublicTopBar.constants';
import styles from './PublicTopBar.module.css';

export default function PublicTopBar() {
  const session = getSession();
  const { pathname } = useLocation();
  const overlay = !session && pathname === HOME_PATH;

  const handleLogout = () => {
    clearSession();
    // Hard navigation to the public home: clears every in-memory guard and
    // avoids racing a protected page's own redirect to /login.
    window.location.assign('/');
  };

  return (
    <header
      className={
        overlay ? `${styles.topbar} ${styles.topbarOverlay}` : styles.topbar
      }
    >
      {/* A signed-in user carries the logo at the head of the nav rail
          (AppShell), so the bar only brands the rail-less public pages. */}


      <div className={styles.actions}>
        {session ? (
          <>
            <Link
              to="/profile"
              className={styles.profileBtn}
              title="Мій профіль"
            >
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
          </>
        ) : (
          <Link
            to="/login"
            className={`${styles.loginBtn} ${styles.loginPrimary}`}
          >
            Увійти
          </Link>
        )}
      </div>
    </header>
  );
}
