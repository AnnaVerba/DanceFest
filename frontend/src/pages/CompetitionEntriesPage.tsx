import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicEntriesList from '../components/PublicEntriesList';
import { getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import styles from './CompetitionEntriesPage.module.css';

// Deep link to the public start list. The list itself lives in
// PublicEntriesList, which the public competition page renders inline too.
export default function CompetitionEntriesPage() {
  const { id } = useParams<{ id: string }>();
  const [competition, setCompetition] = useState<Competition | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getCompetition(id)
      .then((data) => {
        if (!cancelled) setCompetition(data);
      })
      .catch(() => {
        /* the table still renders without the competition name */
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;

  return (
    <main className={styles.main}>
      <Link to={`/competitions/${id}`} className={styles.back}>
        ← До конкурсу
      </Link>
      <h1 className={styles.title}>
        Заявки{competition ? ` · ${competition.name}` : ''}
      </h1>
      <PublicEntriesList competitionId={id} />
    </main>
  );
}
