import type { EntryStats } from '../lib/entryStats.types';
import {
  CITIES_LABEL,
  FACTS_TITLE,
  NOMINATIONS_LABEL,
  PARTICIPANTS_LABEL,
  PERFORMANCES_LABEL,
  STUDIOS_LABEL,
} from './CompetitionFacts.constants';
import styles from './CompetitionFacts.module.css';

interface CompetitionFactsProps {
  stats: EntryStats;
}

export default function CompetitionFacts({ stats }: CompetitionFactsProps) {
  const facts = [
    { label: PARTICIPANTS_LABEL, value: stats.participants },
    { label: PERFORMANCES_LABEL, value: stats.performances },
    { label: STUDIOS_LABEL, value: stats.studios },
    { label: CITIES_LABEL, value: stats.cities },
    { label: NOMINATIONS_LABEL, value: stats.nominations },
    ...stats.lineups.map((lineup) => ({
      label: lineup.label,
      value: lineup.count,
    })),
  ].filter((fact) => fact.value > 0);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{FACTS_TITLE}</h2>
      <div className={styles.grid}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.tile}>
            <div className={styles.value}>{fact.value}</div>
            <div className={styles.label}>{fact.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
