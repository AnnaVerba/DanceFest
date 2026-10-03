import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../lib/http';
import { HTTP_STATUS_NOT_FOUND } from '../../lib/api.constants';
import {
  getPublicProgramOutline,
  getPublicProgramSection,
  searchPublicProgram,
} from '../../lib/program';
import type { PublicProgramRow } from '../../lib/program';
import { groupProgramSections } from '../../lib/programSections';
import type { ProgramSection } from '../../lib/programSections.types';
import {
  PROGRAM_LOAD_ERROR,
  SEARCH_DEBOUNCE_MS,
} from './FestivalProgram.constants';
import type { LazyProgram, ProgramSearchHit } from './useLazyProgram.types';

// The published programme, fetched in pieces: every section header at once,
// a section's performances only when it is opened or a search hits it.
export function useLazyProgram(
  competitionId: string,
  query: string,
): LazyProgram {
  const [outline, setOutline] = useState<PublicProgramRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowsById, setRowsById] = useState<Map<string, PublicProgramRow[]>>(
    new Map(),
  );
  const [searchHit, setSearchHit] = useState<ProgramSearchHit | null>(null);
  // Sections already fetched or on their way, so none is asked for twice.
  const requested = useRef(new Set<string>());

  const storeRows = (rows: PublicProgramRow[]): ProgramSection[] => {
    const grouped = groupProgramSections(rows);
    setRowsById((prev) => {
      const next = new Map(prev);
      for (const section of grouped) next.set(section.id, section.rows);
      return next;
    });
    for (const section of grouped) requested.current.add(section.id);
    return grouped;
  };

  useEffect(() => {
    let cancelled = false;
    getPublicProgramOutline(competitionId)
      .then((rows) => {
        if (!cancelled) setOutline(rows);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (
          error instanceof ApiError &&
          error.status === HTTP_STATUS_NOT_FOUND
        ) {
          setOutline([]);
          return;
        }
        setLoadError(PROGRAM_LOAD_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const needle = query.trim();

  // Debounced, so every keystroke is not a request.
  useEffect(() => {
    if (!needle) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPublicProgram(competitionId, needle)
        .then((rows) => {
          if (cancelled) return;
          const grouped = storeRows(rows);
          setSearchHit({
            query: needle,
            sectionIds: new Set(grouped.map((section) => section.id)),
          });
        })
        .catch(() => {
          if (!cancelled) setLoadError(PROGRAM_LOAD_ERROR);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [competitionId, needle]);

  const sections = useMemo(
    () =>
      groupProgramSections(outline ?? []).map((section) => ({
        ...section,
        rows: rowsById.get(section.id) ?? [],
      })),
    [outline, rowsById],
  );

  const loadSections = (toLoad: ProgramSection[]) => {
    for (const section of toLoad) {
      const { sectionId } = section.head;
      if (!sectionId || requested.current.has(section.id)) continue;
      requested.current.add(section.id);
      getPublicProgramSection(competitionId, sectionId)
        .then(storeRows)
        .catch(() => {
          requested.current.delete(section.id);
          setLoadError(PROGRAM_LOAD_ERROR);
        });
    }
  };

  return {
    outline,
    loadError,
    sections,
    matchedIds:
      needle && searchHit?.query === needle ? searchHit.sectionIds : null,
    isLoaded: (section) => rowsById.has(section.id),
    loadSections,
  };
}
