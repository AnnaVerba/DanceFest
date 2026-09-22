import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ApiError } from '../../lib/http';
import { HTTP_STATUS_NOT_FOUND } from '../../lib/api.constants';
import { getMyProgram, getPublicProgram, hasSession } from '../../lib/program';
import type { MineProgram, PublicProgramRow } from '../../lib/program';
import { getVenues } from '../../lib/venues';
import type { Venue } from '../../lib/venues';
import {
  filterMineSections,
  groupProgramSections,
  groupSectionsByVenue,
  sectionMatchesQuery,
} from '../../lib/programSections';
import ProgramSectionBlock from './ProgramSectionBlock';
import MyProgramBlock from './MyProgramBlock';
import {
  COLLAPSE_ALL_LABEL,
  EXPAND_ALL_LABEL,
  FULL_PROGRAM_TITLE,
  JUMP_TO_SECTION_LABEL,
  LOAD_MORE_LABEL,
  NO_VENUE_KEY,
  PROGRAM_LOAD_ERROR,
  PROGRAM_LOADING_LABEL,
  PROGRAM_NOT_PUBLISHED_LABEL,
  PROGRAM_SUBTITLE,
  SEARCH_NO_RESULTS_LABEL,
  SEARCH_PLACEHOLDER,
  VENUE_TABS_LABEL,
} from './FestivalProgram.constants';
import styles from './FestivalProgram.module.css';

interface FestivalProgramProps {
  competitionId: string;
}

// The read-only festival programme for everyone who does not edit it: one
// tab per venue, each section collapsed until opened. A signed-in dancer or
// coach also gets their own performances highlighted on top.
export default function FestivalProgram({ competitionId }: FestivalProgramProps) {
  const [publicRows, setPublicRows] = useState<PublicProgramRow[] | null>(null);
  const [programPage, setProgramPage] = useState(0);
  const [programPageCount, setProgramPageCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [mine, setMine] = useState<MineProgram | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeVenueIndex, setActiveVenueIndex] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const hasMore = programPage + 1 < programPageCount;

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    getPublicProgram(competitionId, { page: programPage + 1 })
      .then((paged) => {
        setPublicRows((prev) => [...(prev ?? []), ...paged.rows]);
        setProgramPage(paged.page);
        setProgramPageCount(paged.pageCount);
      })
      .catch(() => setLoadError(PROGRAM_LOAD_ERROR))
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    let cancelled = false;

    getPublicProgram(competitionId)
      .then((paged) => {
        if (cancelled) return;
        setPublicRows(paged.rows);
        setProgramPage(paged.page);
        setProgramPageCount(paged.pageCount);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (
          error instanceof ApiError &&
          error.status === HTTP_STATUS_NOT_FOUND
        ) {
          setPublicRows([]);
          return;
        }
        setLoadError(PROGRAM_LOAD_ERROR);
      });

    getVenues(competitionId)
      .then((list) => {
        if (!cancelled) setVenues(list);
      })
      .catch(() => {
        /* tab names are cosmetic — the programme still renders */
      });

    if (hasSession()) {
      getMyProgram(competitionId)
        .then((data) => {
          if (!cancelled) setMine(data);
        })
        .catch(() => {
          /* personal cut is optional — the full programme still renders */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const venuePrograms = useMemo(
    () => groupSectionsByVenue(groupProgramSections(publicRows ?? []), venues),
    [publicRows, venues],
  );

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;
  const activeVenue =
    venuePrograms[Math.min(activeVenueIndex, venuePrograms.length - 1)];
  const visibleSections = useMemo(
    () =>
      (activeVenue?.sections ?? []).filter(
        (section) => !searching || sectionMatchesQuery(section, needle),
      ),
    [activeVenue, searching, needle],
  );

  const showDayHeadings =
    new Set(visibleSections.map((s) => s.head.dayId)).size > 1;

  // The personal cut follows the open venue tab and the search, so it can
  // never contradict the programme rendered under it.
  const mineSections = filterMineSections(
    (mine?.sections ?? []).filter(
      (section) => section.venueId === activeVenue?.venueId,
    ),
    needle,
  );

  if (loadError) {
    return <p className={styles.status}>{loadError}</p>;
  }

  if (!publicRows) {
    return <p className={styles.status}>{PROGRAM_LOADING_LABEL}</p>;
  }

  // A search opens every section it matched, so the hit is visible at once.
  const isExpanded = (sectionId: string) =>
    searching || expandedIds.has(sectionId);

  const toggleSection = (sectionId: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(sectionId)) next.add(sectionId);
      return next;
    });

  const setAllExpanded = (expanded: boolean) =>
    setExpandedIds(
      expanded ? new Set(visibleSections.map((s) => s.id)) : new Set(),
    );

  const jumpToSection = (event: ChangeEvent<HTMLSelectElement>) => {
    const sectionId = event.target.value;
    if (!sectionId) return;
    setExpandedIds((prev) => new Set(prev).add(sectionId));
    // The section body mounts on the next render; scroll once it has.
    requestAnimationFrame(() =>
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' }),
    );
    event.target.value = '';
  };

  return (
    <div>
      <p className={styles.subtitle}>{PROGRAM_SUBTITLE}</p>

      {publicRows.length === 0 && (
        <p className={styles.status}>{PROGRAM_NOT_PUBLISHED_LABEL}</p>
      )}

      {venuePrograms.length > 1 && (
        <div className={styles.venueTabs} role="tablist" aria-label={VENUE_TABS_LABEL}>
          {venuePrograms.map((venue, index) => (
            <button
              key={venue.venueId ?? NO_VENUE_KEY}
              type="button"
              role="tab"
              aria-selected={venue === activeVenue}
              className={styles.venueTab}
              onClick={() => setActiveVenueIndex(index)}
            >
              {venue.name}
            </button>
          ))}
        </div>
      )}

      {publicRows.length > 0 && (
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            placeholder={SEARCH_PLACEHOLDER}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => setAllExpanded(true)}
          >
            {EXPAND_ALL_LABEL}
          </button>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => setAllExpanded(false)}
          >
            {COLLAPSE_ALL_LABEL}
          </button>
          <select
            className={styles.toolbarButton}
            defaultValue=""
            onChange={jumpToSection}
            aria-label={JUMP_TO_SECTION_LABEL}
          >
            <option value="">{JUMP_TO_SECTION_LABEL}</option>
            {visibleSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.head.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {mineSections.length > 0 && (
        <>
          <MyProgramBlock sections={mineSections} />
          <h2 className={styles.sectionName}>{FULL_PROGRAM_TITLE}</h2>
        </>
      )}

      {searching && visibleSections.length === 0 && (
        <p className={styles.status}>{SEARCH_NO_RESULTS_LABEL}</p>
      )}

      {visibleSections.map((section, index) => {
        const newDay =
          index === 0 ||
          visibleSections[index - 1].head.dayId !== section.head.dayId;
        return (
          <div key={section.id}>
            {showDayHeadings && newDay && section.head.dayDate && (
              <h3 className={styles.dayHeading}>{section.head.dayDate}</h3>
            )}
            <ProgramSectionBlock
              section={section}
              expanded={isExpanded(section.id)}
              onToggle={toggleSection}
            />
          </div>
        );
      })}

      {hasMore && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? PROGRAM_LOADING_LABEL : LOAD_MORE_LABEL}
        </button>
      )}
    </div>
  );
}
