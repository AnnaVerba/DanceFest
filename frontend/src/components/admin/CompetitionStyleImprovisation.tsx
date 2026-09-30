import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StyleImprovisationToggle from '../nominations/StyleImprovisationToggle';
import { STYLE_CATEGORY_TYPE } from '../../lib/categories';
import type { Category } from '../../lib/categories';
import { applyCategoryToCache } from '../../lib/categoriesCache';
import { getNominationAxes } from '../../lib/nominations';
import { refreshNominations } from '../../lib/nominationsCache';
import { queryKeys } from '../../lib/queryKeys';
import { getSession } from '../../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../../lib/roles';
import {
  STYLE_IMPROVISATION_INTRO,
  STYLE_IMPROVISATION_TITLE,
} from './CompetitionStyleImprovisation.constants';
import styles from './CompetitionStyleImprovisation.module.css';

interface CompetitionStyleImprovisationProps {
  competitionId: string;
  // The shared dictionary — the competition's axes carry no improvisation
  // flag, so each style's current state is read from here.
  categories: Category[];
  onError: (message: string) => void;
}

// Styles met in this competition's nominations, each with its improvisation
// switch. The flag is shared by every competition, so only an admin sees it.
export default function CompetitionStyleImprovisation({
  competitionId,
  categories,
  onError,
}: CompetitionStyleImprovisationProps) {
  const queryClient = useQueryClient();
  const session = getSession();
  const isAdmin =
    !!session && meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ADMIN);

  const axesQuery = useQuery({
    queryKey: queryKeys.nominationAxes(competitionId),
    queryFn: () => getNominationAxes(competitionId),
    enabled: isAdmin,
  });

  const competitionStyles = useMemo(() => {
    const styleIds = new Set(
      (axesQuery.data?.[STYLE_CATEGORY_TYPE] ?? []).map((value) => value.id),
    );
    return categories.filter((category) => styleIds.has(category.id));
  }, [axesQuery.data, categories]);

  // The server re-derives this competition's nominations and entries from
  // the flipped style, so both are refetched.
  const handleSaved = (updated: Category) => {
    applyCategoryToCache(queryClient, updated);
    refreshNominations(queryClient, competitionId);
    void queryClient.invalidateQueries({ queryKey: queryKeys.entries(competitionId) });
  };

  if (!isAdmin || competitionStyles.length === 0) return null;

  return (
    <section className={styles.block}>
      <h3 className={styles.title}>{STYLE_IMPROVISATION_TITLE}</h3>
      <p className={styles.intro}>{STYLE_IMPROVISATION_INTRO}</p>
      <ul className={styles.styles}>
        {competitionStyles.map((category) => (
          <li key={category.id} className={styles.style}>
            {category.name}
            <StyleImprovisationToggle
              category={category}
              onSaved={handleSaved}
              onError={onError}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
