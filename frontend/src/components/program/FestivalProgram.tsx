import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { getMyProgram, hasSession } from '../../lib/program';
import type { MineProgram } from '../../lib/program';
import { getVenues } from '../../lib/venues';
import type { Venue } from '../../lib/venues';
import {
  groupSectionsByVenue,
  indexMineSections,
  markMineGroups,
} from '../../lib/programSections';
import ProgramSectionBlock from './ProgramSectionBlock';
import { useLazyProgram } from './useLazyProgram';
import {
  COLLAPSE_ALL_LABEL,
  EXPAND_ALL_LABEL,
  JUMP_TO_SECTION_LABEL,
  NO_VENUE_KEY,
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
// tab per venue, each section collapsed until opened — and its performances
// fetched only then. A signed-in dancer or coach sees the nominations they
// (or their students) perform in highlighted.
export default function FestivalProgram({ competitionId }: FestivalProgramProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [mine, setMine] = useState<MineProgram | null>(null);
  const [query, setQuery] = useState('');
  const [activeVenueIndex, setActiveVenueIndex] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const program = useLazyProgram(competitionId, query);
  const { outline, loadError, sections, matchedIds } = program;

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

  const venuePrograms = useMemo(
    () => groupSectionsByVenue(sections, venues),
    [sections, venues],
  );

  const searching = query.trim().length > 0;
  const searchPending = searching && matchedIds === null;
  const activeVenue =
    venuePrograms[Math.min(activeVenueIndex, venuePrograms.length - 1)];
  const visibleSections = useMemo(
    () =>
      (activeVenue?.sections ?? []).filter(
        (section) => !searching || (matchedIds?.has(section.id) ?? false),
      ),
    [activeVenue, searching, matchedIds],
  );

  const showDayHeadings =
    new Set(visibleSections.map((s) => s.head.dayId)).size > 1;

  const mineByKey = useMemo(
    () => indexMineSections(mine?.sections ?? []),
    [mine],
  );

  if (loadError) {
    return <p className={styles.status}>{loadError}</p>;
  }

  if (!outline) {
    return <p className={styles.status}>{PROGRAM_LOADING_LABEL}</p>;
  }

  // A search opens every section it matched, so the hit is visible at once.
  const isExpanded = (sectionId: string) =>
    searching || expandedIds.has(sectionId);

  // As a list, so it goes straight to loadSections; empty if not shown.
  const sectionsWithId = (sectionId: string) =>
    visibleSections.filter((section) => section.id === sectionId);

  const toggleSection = (sectionId: string) => {
    if (!expandedIds.has(sectionId)) program.loadSections(sectionsWithId(sectionId));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(sectionId)) next.add(sectionId);
      return next;
    });
  };

  const setAllExpanded = (expanded: boolean) => {
    if (expanded) program.loadSections(visibleSections);
    setExpandedIds(
      expanded ? new Set(visibleSections.map((s) => s.id)) : new Set(),
    );
  };

  const jumpToSection = (event: ChangeEvent<HTMLSelectElement>) => {
    const sectionId = event.target.value;
    if (!sectionId) return;
    program.loadSections(sectionsWithId(sectionId));
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

      {outline.length === 0 && (
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

      {outline.length > 0 && (
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

      {searchPending && (
        <p className={styles.status}>{PROGRAM_LOADING_LABEL}</p>
      )}

      {searching && !searchPending && visibleSections.length === 0 && (
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
              loading={!program.isLoaded(section)}
              marks={markMineGroups(section, mineByKey)}
              onToggle={toggleSection}
            />
          </div>
        );
      })}

    </div>
  );
}
