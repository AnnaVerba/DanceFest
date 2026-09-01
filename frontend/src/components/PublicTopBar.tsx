import { Link } from 'react-router-dom';
import styles from './PublicTopBar.module.css';

export default function PublicTopBar() {
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
      <Link to="/login" className={styles.loginBtn}>
        Увійти
      </Link>
    </header>
  );
}
