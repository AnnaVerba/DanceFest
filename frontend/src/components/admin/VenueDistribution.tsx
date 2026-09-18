import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import NominationFilterBar from './nominationSelection/NominationFilterBar';
import NominationBulkBar from './nominationSelection/NominationBulkBar';
import NominationPager from './nominationSelection/NominationPager';
import { useNominationSelection } from './nominationSelection/useNominationSelection';
import { useNominationsPage } from './nominationSelection/useNominationsPage';
import {
  NOTHING_FOUND_MESSAGE,
  SELECT_NOMINATION_ARIA_PREFIX,
} from './nominationSelection/nominationFilters.constants';
import { assignVenueBulk, updateNomination } from '../../lib/nominations';
import type { Nomination, NominationBulkSelector } from '../../lib/nominations';
import type { Venue } from '../../lib/venues';
import { refreshNominations } from '../../lib/nominationsCache';
import { NOMINATIONS_PAGE_SIZE } from '../../lib/nominations.constants';
import {
  toVenueId,
  toVenueSelectValue,
  venueOptionLabel,
} from '../../lib/nominationVenue';
import {
  BULK_VENUE_ARIA_LABEL,
  BULK_VENUE_PLACEHOLDER,
  BULK_VENUE_SUBMITTING_LABEL,
  BULK_VENUE_SUBMIT_LABEL,
  BULK_VENUE_UNASSIGN_LABEL,
  DISTRIBUTION_HINT,
  DISTRIBUTION_LOADING_LABEL,
  DISTRIBUTION_NO_NOMINATIONS_MESSAGE,
  DISTRIBUTION_TITLE,
  NOMINATIONS_LOAD_ERROR_MESSAGE,
  NO_VENUE_CHOICE,
  UNASSIGNED_VENUE_VALUE,
  VENUE_ASSIGN_ERROR_MESSAGE,
  VENUE_ROW_ARIA_LABEL_PREFIX,
  VENUE_UNASSIGNED_LABEL,
} from '../../lib/nominationVenue.constants';
import styles from './VenueDistribution.module.css';

interface VenueDistributionProps {
  competitionId: string;
  venues: Venue[];
  onError: (message: string) => void;
}

export default function VenueDistribution({
  competitionId,
  venues,
  onError,
}: VenueDistributionProps) {
  const queryClient = useQueryClient();
  const [bulkVenueChoice, setBulkVenueChoice] = useState(NO_VENUE_CHOICE);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const selection = useNominationSelection(NOMINATIONS_PAGE_SIZE);
  const pageQuery = useNominationsPage(competitionId, selection);
  const rows = pageQuery.data?.rows ?? [];
  const total = pageQuery.data?.total ?? 0;

  useEffect(() => {
    if (pageQuery.isError) onError(NOMINATIONS_LOAD_ERROR_MESSAGE);
  }, [pageQuery.isError, onError]);

  const assignBulkMutation = useMutation({
    mutationFn: (args: { selector: NominationBulkSelector; venueId: string | null }) =>
      assignVenueBulk(competitionId, args.selector, args.venueId),
    onSuccess: () => {
      refreshNominations(queryClient, competitionId);
      selection.clearSelection();
    },
  });

  const assignOneMutation = useMutation({
    mutationFn: (args: { id: string; venueId: string | null }) =>
      updateNomination(competitionId, args.id, { venueId: args.venueId }),
    onSuccess: (updated) => {
      refreshNominations(queryClient, competitionId);
      selection.deselect(updated.id);
    },
  });

  const setSaving = (id: string, saving: boolean) =>
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleBulkAssign = async () => {
    if (
      selection.selectedCount(total) === 0 ||
      bulkVenueChoice === NO_VENUE_CHOICE ||
      assignBulkMutation.isPending
    ) {
      return;
    }
    try {
      await assignBulkMutation.mutateAsync({
        selector: selection.buildBulkSelector(),
        venueId: toVenueId(bulkVenueChoice),
      });
      setBulkVenueChoice(NO_VENUE_CHOICE);
    } catch {
      onError(VENUE_ASSIGN_ERROR_MESSAGE);
    }
  };

  const handleRowAssign = async (nomination: Nomination, value: string) => {
    if (savingIds.has(nomination.id)) return;
    setSaving(nomination.id, true);
    try {
      await assignOneMutation.mutateAsync({ id: nomination.id, venueId: toVenueId(value) });
    } catch {
      onError(VENUE_ASSIGN_ERROR_MESSAGE);
    } finally {
      setSaving(nomination.id, false);
    }
  };

  const competitionHasNoNominations =
    pageQuery.isSuccess && total === 0 && !selection.hasActiveFilter;

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>{DISTRIBUTION_TITLE}</h3>
      <p className={styles.hint}>{DISTRIBUTION_HINT}</p>

      {pageQuery.isLoading && <p className={styles.status}>{DISTRIBUTION_LOADING_LABEL}</p>}

      {competitionHasNoNominations && (
        <p className={styles.status}>{DISTRIBUTION_NO_NOMINATIONS_MESSAGE}</p>
      )}

      {pageQuery.isSuccess && !competitionHasNoNominations && (
        <>
          <NominationFilterBar selection={selection} venues={venues} />

          {total === 0 && <p className={styles.status}>{NOTHING_FOUND_MESSAGE}</p>}

          <NominationBulkBar selection={selection} total={total}>
            <span className={styles.bulkVenue}>
              <select
                className={styles.bulkSelect}
                aria-label={BULK_VENUE_ARIA_LABEL}
                value={bulkVenueChoice}
                onChange={(e) => setBulkVenueChoice(e.target.value)}
              >
                <option value={NO_VENUE_CHOICE}>{BULK_VENUE_PLACEHOLDER}</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venueOptionLabel(venue)}
                  </option>
                ))}
                <option value={UNASSIGNED_VENUE_VALUE}>{BULK_VENUE_UNASSIGN_LABEL}</option>
              </select>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={bulkVenueChoice === NO_VENUE_CHOICE || assignBulkMutation.isPending}
                onClick={() => void handleBulkAssign()}
              >
                {assignBulkMutation.isPending
                  ? BULK_VENUE_SUBMITTING_LABEL
                  : BULK_VENUE_SUBMIT_LABEL}
              </button>
            </span>
          </NominationBulkBar>

          <ul className={styles.rows}>
            {rows.map((nomination) => (
              <li key={nomination.id} className={styles.row}>
                <input
                  type="checkbox"
                  aria-label={`${SELECT_NOMINATION_ARIA_PREFIX} ${nomination.name}`}
                  checked={selection.isSelected(nomination.id)}
                  disabled={selection.allFilteredSelected}
                  onChange={() => selection.toggleSelected(nomination.id)}
                />
                <span className={styles.rowName}>{nomination.name}</span>
                <select
                  className={styles.rowSelect}
                  aria-label={`${VENUE_ROW_ARIA_LABEL_PREFIX} ${nomination.name}`}
                  value={toVenueSelectValue(nomination.venueId)}
                  disabled={savingIds.has(nomination.id)}
                  onChange={(e) => void handleRowAssign(nomination, e.target.value)}
                >
                  <option value={UNASSIGNED_VENUE_VALUE}>{VENUE_UNASSIGNED_LABEL}</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          <NominationPager selection={selection} total={total} />
        </>
      )}
    </section>
  );
}
