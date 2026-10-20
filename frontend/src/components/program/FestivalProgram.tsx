import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyProgram, hasSession } from '../../lib/program';
import type { MineProgram, PublicProgramRow } from '../../lib/program';
import { getVenues } from '../../lib/venues';
import type { Venue } from '../../lib/venues';
import { ApiError } from '../../lib/http';
import { HTTP_STATUS_NOT_FOUND } from '../../lib/api.constants';
import { queryKeys } from '../../lib/queryKeys';
import { fetchWholeProgram } from '../../lib/wholeProgram';
import { PublishedProgramSource } from '../../lib/PublishedProgramSource';
import {
  groupProgramSections,
  groupSectionsByVenue,
  indexMineSections,
  markMineGroups,
  sectionMatchesQuery,
} from '../../lib/programSections';
import ProgramSectionBlock from './ProgramSectionBlock';
import {
  JUMP_TO_SECTION_LABEL,
  NO_VENUE_KEY,
  PROGRAM_LOADING_LABEL,
  PROGRAM_LOAD_ERROR,
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

// The published programme, whole; an unpublished one reads as empty.
async function fetchPublishedProgram(
  competitionId: string,
): Promise<PublicProgramRow[]> {
  try {
    return await fetchWholeProgram(new PublishedProgramSource(competitionId));
  } catch (error) {
    if (error instanceof ApiError && error.status === HTTP_STATUS_NOT_FOUND) {
      return [];
    }
    throw error;
  }
}

// The read-only festival programme for everyone who does not edit it: one
// tab per venue, every section in one list with each nomination's time. A
// signed-in dancer or coach sees the nominations they (or their students)
// perform in highlighted.
export default function FestivalProgram({ competitionId }: FestivalProgramProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [mine, setMine] = useState<MineProgram | null>(null);
  const [query, setQuery] = useState('');
  const [activeVenueIndex, setActiveVenueIndex] = useState(0);
  const programQuery = useQuery({
    queryKey: queryKeys.publicProgram(competitionId),
    queryFn: () => fetchPublishedProgram(competitionId),
  });

  useEffect(() => {
    let cancelled = false;

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

  const rows = programQuery.data;
  const venuePrograms = useMemo(
    () => groupSectionsByVenue(groupProgramSections(rows ?? []), venues),
    [rows, venues],
  );

  const needle = query.trim().toLowerCase();
  const activeVenue =
    venuePrograms[Math.min(activeVenueIndex, venuePrograms.length - 1)];
  const visibleSections = useMemo(
    () =>
      (activeVenue?.sections ?? []).filter(
        (section) => !needle || sectionMatchesQuery(section, needle),
      ),
    [activeVenue, needle],
  );

  const showDayHeadings =
    new Set(visibleSections.map((s) => s.head.dayId)).size > 1;

  const mineByKey = useMemo(
    () => indexMineSections(mine?.sections ?? []),
    [mine],
  );

  if (programQuery.isError) {
    return <p className={styles.status}>{PROGRAM_LOAD_ERROR}</p>;
  }

  if (!rows) {
    return <p className={styles.status}>{PROGRAM_LOADING_LABEL}</p>;
  }

  const jumpToSection = (event: ChangeEvent<HTMLSelectElement>) => {
    const sectionId = event.target.value;
    if (!sectionId) return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    event.target.value = '';
  };

  return (
    <div>
      <p className={styles.subtitle}>{PROGRAM_SUBTITLE}</p>

      {rows.length === 0 && (
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

      {rows.length > 0 && (
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            placeholder={SEARCH_PLACEHOLDER}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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

      {needle && visibleSections.length === 0 && (
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
              marks={markMineGroups(section, mineByKey)}
            />
          </div>
        );
      })}

    </div>
  );
}
