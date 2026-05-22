import Nav from './Nav';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>
          <span className={styles.logoIcon}>&#9670;</span>
          DanseFest
        </a>
        <Nav />
      </div>
    </header>
  );
}
