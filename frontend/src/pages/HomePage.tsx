import { useQuery } from '@apollo/client/react';
import { GET_COMPETITIONS } from '../graphql/queries';
import styles from './HomePage.module.css';

interface Competition {
  id: string;
  name: string;
  date: string;
  location: string;
  style: string;
}

export default function HomePage() {
  const { data, loading, error } = useQuery<{ competitions: Competition[] }>(
    GET_COMPETITIONS,
  );

  return (
    <main>
      <section id="home" className={styles.hero}>
        <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Ласкаво просимо</p>
          <h1 className={styles.title}>DanceFest</h1>
          <p className={styles.subtitle}>
            Платформа для організації та проведення танцювальних конкурсів
          </p>
          <div className={styles.actions}>
            <a href="#competitions" className={styles.btnPrimary}>
              Переглянути конкурси
            </a>
            <a href="#contacts" className={styles.btnSecondary}>
              Зв&apos;язатися з нами
            </a>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.circle1} />
          <div className={styles.circle2} />
          <div className={styles.diamond}>&#9670;</div>
        </div>
        </div>
      </section>

      <section id="competitions" className={styles.section}>
        <h2 className={styles.sectionTitle}>Найближчі конкурси</h2>
        <p className={styles.sectionSub}>
          Реєструйтесь та беріть участь у найкращих танцювальних подіях України
        </p>

        {loading && <p className={styles.status}>Завантаження...</p>}
        {error && (
          <p className={styles.status}>
            Бекенд не підключено — дані з GraphQL з&apos;являться після запуску сервера.
          </p>
        )}

        {data && (
          <div className={styles.cards}>
            {data.competitions.map((c: Competition) => (
              <article key={c.id} className={styles.card}>
                <span className={styles.cardStyle}>{c.style}</span>
                <h3 className={styles.cardTitle}>{c.name}</h3>
                <dl className={styles.cardMeta}>
                  <div>
                    <dt>Дата</dt>
                    <dd>{new Date(c.date).toLocaleDateString('uk-UA')}</dd>
                  </div>
                  <div>
                    <dt>Місце</dt>
                    <dd>{c.location}</dd>
                  </div>
                </dl>
                <button className={styles.cardBtn}>Зареєструватися</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="participants" className={styles.section}>
        <h2 className={styles.sectionTitle}>Учасники</h2>
        <p className={styles.sectionSub}>Розділ у розробці</p>
      </section>

      <section id="judging" className={styles.section}>
        <h2 className={styles.sectionTitle}>Суддівство</h2>
        <p className={styles.sectionSub}>Розділ у розробці</p>
      </section>

      <section id="contacts" className={styles.section}>
        <h2 className={styles.sectionTitle}>Контакти</h2>
        <p className={styles.sectionSub}>
          Зв&apos;яжіться з організаторами для отримання додаткової інформації
        </p>
      </section>
    </main>
  );
}
