import { useEffect, useState } from 'react';
import { getCompetitions } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import styles from './HomePage.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isRegistrationOpen(registrationTo: string): boolean {
  return new Date(registrationTo) >= new Date(new Date().toDateString());
}

export default function HomePage() {
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCompetitions()
      .then((data) => {
        if (!cancelled) setCompetitions(data);
      })
      .catch(() => {
        if (!cancelled) setError('Не вдалося завантажити конкурси. Спробуйте оновити сторінку.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <section id="home" className={styles.hero}>
        <p className={styles.eyebrow}>Ласкаво просимо</p>
        <h1 className={styles.title}>DanseFest</h1>
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
      </section>

      <section id="competitions" className={styles.section}>
        <h2 className={styles.sectionTitle}>Найближчі конкурси</h2>
        <p className={styles.sectionSub}>
          Реєструйтесь та беріть участь у найкращих танцювальних подіях України
        </p>

        {loading && <p className={styles.status}>Завантаження...</p>}
        {error && <p className={styles.status}>{error}</p>}
        {!loading && !error && competitions?.length === 0 && (
          <p className={styles.status}>Поки що немає запланованих конкурсів</p>
        )}

        {!loading && !error && competitions && competitions.length > 0 && (
          <div className={styles.cards}>
            {competitions.map((c) => (
              <article key={c.id} className={styles.card}>
                {c.image ? (
                  <img src={c.image} alt="" className={styles.cardImage} />
                ) : (
                  <div className={styles.cardImagePlaceholder} aria-hidden="true">
                    &#9670;
                  </div>
                )}
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{c.name}</h3>
                  <p className={styles.cardDescription}>{c.description}</p>
                  <dl className={styles.cardMeta}>
                    <div>
                      <dt>Дати</dt>
                      <dd>
                        {formatDate(c.dateFrom)} – {formatDate(c.dateTo)}
                      </dd>
                    </div>
                    <div>
                      <dt>Реєстрація</dt>
                      <dd>до {formatDate(c.registrationTo)}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={styles.cardBtn}
                    disabled={!isRegistrationOpen(c.registrationTo)}
                  >
                    {isRegistrationOpen(c.registrationTo)
                      ? 'Зареєструватися'
                      : 'Реєстрацію закрито'}
                  </button>
                </div>
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
