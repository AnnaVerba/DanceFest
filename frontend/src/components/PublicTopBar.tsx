import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../lib/auth';
import { ROLE_CABINET_LABEL, ROLE_CABINET_PATH } from '../lib/roles';
import styles from './PublicTopBar.module.css';

export default function PublicTopBar() {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
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
        <div className={styles.authArea}>
          <Link to={ROLE_CABINET_PATH[session.role]} className={styles.cabinetLink}>
            {ROLE_CABINET_LABEL[session.role]}
          </Link>
          <span className={styles.email}>{session.profile.email}</span>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
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
