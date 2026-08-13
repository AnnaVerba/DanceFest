import { Link } from 'react-router-dom';
import styles from './PlaceholderPage.module.css';

interface PlaceholderPageProps {
  title: string;
}

/** Заглушка для екранів зі скрін-бару, які ще не реалізовані. */
export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>Розділ у розробці</p>
        <Link to="/" className={styles.back}>
          ← На головну
        </Link>
      </div>
    </main>
  );
}
