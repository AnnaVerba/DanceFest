import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignVenueBulk, getVenueSummary } from '../../lib/nominations';
import type { VenueSummaryGroupBy, VenueSummaryRow } from '../../lib/nominations.types';
import type { Venue } from '../../lib/venues';
import { refreshNominations } from '../../lib/nominationsCache';
import { summaryVenueChoice } from '../../lib/nominationVenue';
import { queryKeys } from '../../lib/queryKeys';
import {
  NO_VENUE_CHOICE,
  QUICK_ASSIGN_ARIA_PREFIX,
  QUICK_ASSIGN_LABEL,
  QUICK_GROUP_BY_AGE,
  QUICK_GROUP_BY_AGE_LABEL,
  QUICK_GROUP_BY_LEAGUE,
  QUICK_GROUP_BY_LEAGUE_LABEL,
  QUICK_HINT,
  QUICK_NO_VENUE_LABEL,
  QUICK_SELECT_ARIA_PREFIX,
  QUICK_TITLE,
  SUMMARY_LOAD_ERROR_MESSAGE,
  VENUE_ASSIGN_ERROR_MESSAGE,
} from '../../lib/nominationVenue.constants';
import styles from './VenueQuickDistribution.module.css';

interface VenueQuickDistributionProps {
  competitionId: string;
  venues: Venue[];
  onError: (message: string) => void;
}

export default function VenueQuickDistribution({
  competitionId,
  venues,
  onError,
}: VenueQuickDistributionProps) {
  const queryClient = useQueryClient();
  const [groupBy, setGroupBy] = useState<VenueSummaryGroupBy>(QUICK_GROUP_BY_LEAGUE);
  const [choices, setChoices] = useState<Record<string, string>>({});

  const summaryQuery = useQuery({
    queryKey: queryKeys.venueSummary(competitionId, groupBy),
    queryFn: () => getVenueSummary(competitionId, groupBy),
  });
  const rows = summaryQuery.data ?? [];

  useEffect(() => {
    if (summaryQuery.isError) onError(SUMMARY_LOAD_ERROR_MESSAGE);
  }, [summaryQuery.isError, onError]);

  // The whole category moves to the one chosen venue, already-placed
  // nominations included.
  const assignMutation = useMutation({
    mutationFn: (args: { categoryId: string; venueId: string }) =>
      assignVenueBulk(
        competitionId,
        { filter: { categoryIds: [args.categoryId] } },
        args.venueId,
      ),
    // The choice is dropped, so the select falls back to the venue the
    // refreshed summary reports for the category.
    onSuccess: (_updated, args) => {
      refreshNominations(queryClient, competitionId);
      setChoices((prev) => {
        const next = { ...prev };
        delete next[args.categoryId];
        return next;
      });
    },
  });

  // The organizer's pick, else the venue the category already stands on.
  const selectedVenueOf = (row: VenueSummaryRow) =>
    choices[row.categoryId] ?? summaryVenueChoice(row);

  const handleAssign = async (row: VenueSummaryRow) => {
    const venueId = selectedVenueOf(row);
    if (venueId === NO_VENUE_CHOICE || assignMutation.isPending) return;
    try {
      await assignMutation.mutateAsync({ categoryId: row.categoryId, venueId });
    } catch {
      onError(VENUE_ASSIGN_ERROR_MESSAGE);
    }
  };

  // Nothing to do while no venue is picked or the category already stands
  // on the picked one.
  const nothingToAssign = (row: VenueSummaryRow) => {
    const selected = selectedVenueOf(row);
    return selected === NO_VENUE_CHOICE || selected === summaryVenueChoice(row);
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>{QUICK_TITLE}</h3>
      <p className={styles.hint}>{QUICK_HINT}</p>

      <div className={styles.controls}>
        <div className={styles.toggle} role="group">
          {[
            { value: QUICK_GROUP_BY_LEAGUE, label: QUICK_GROUP_BY_LEAGUE_LABEL },
            { value: QUICK_GROUP_BY_AGE, label: QUICK_GROUP_BY_AGE_LABEL },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                groupBy === option.value ? styles.toggleActive : styles.toggleButton
              }
              aria-pressed={groupBy === option.value}
              onClick={() => setGroupBy(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <ul className={styles.grid}>
          {rows.map((row) => (
            <li key={row.categoryId} className={styles.item}>
              <span className={styles.name} title={row.name}>
                {row.name}
              </span>
              <select
                className={styles.select}
                aria-label={`${QUICK_SELECT_ARIA_PREFIX} ${row.name}`}
                value={selectedVenueOf(row)}
                onChange={(e) =>
                  setChoices((prev) => ({ ...prev, [row.categoryId]: e.target.value }))
                }
              >
                <option value={NO_VENUE_CHOICE} hidden>
                  {QUICK_NO_VENUE_LABEL}
                </option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.btnPrimary}
                aria-label={`${QUICK_ASSIGN_ARIA_PREFIX} ${row.name}`}
                disabled={nothingToAssign(row) || assignMutation.isPending}
                onClick={() => void handleAssign(row)}
              >
                {QUICK_ASSIGN_LABEL}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
