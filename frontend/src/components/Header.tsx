import { Link } from 'react-router-dom';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>&#9670;</span>
          DanseFest
        </Link>
        <Link to="/login" className={styles.loginBtn}>
          Увійти
        </Link>
      </div>
    </header>
  );
}
