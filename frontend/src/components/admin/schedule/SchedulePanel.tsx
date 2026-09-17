import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../ConfirmDialog';
import UnassignedPool from './UnassignedPool';
import BuildSectionModal from './BuildSectionModal';
import MergeGroupsModal from './MergeGroupsModal';
import ProgramTable from './ProgramTable';
import ProgramPoster from './ProgramPoster';
import type { GroupOption } from './MergeGroupsModal';
import {
  addRow,
  buildSection,
  deleteRow,
  deleteSection,
  getDays,
  getSections,
  getSectionsStats,
  getSectionsSummary,
  getUnassigned,
  getUnassignedFacets,
  getUnassignedIds,
  mergeGroups,
  moveExit,
  recalculateSchedule,
  reorderSection,
  reorderSections,
  unmergeGroup,
  updateRow,
  updateSection,
} from '../../../lib/schedule';
import type {
  AssignedClash,
  Section,
  SectionItem,
  UnassignedFacets,
} from '../../../lib/schedule';
import type { RowPaged } from '../../../lib/pagination';
import { getPublicProgram } from '../../../lib/program';
import type { PublicProgramRow } from '../../../lib/program';
import { getVenues } from '../../../lib/venues';
import { formatClock } from '../../../lib/duration';
import { ApiError } from '../../../lib/http';
import { getCompetitionStatus } from '../../../lib/competitions';
import type { Competition } from '../../../lib/competitions';
import { COMPETITION_STATUS } from '../../../lib/competitionStatus';
import { queryKeys } from '../../../lib/queryKeys';
import { TIMING_STALE_TIME_MS } from '../../../lib/queryClient.constants';
import styles from './program.module.css';

interface SchedulePanelProps {
  competitionId: string;
  competition: Competition;
  canManage: boolean;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

const HTTP_CONFLICT = 409;
const HTTP_BAD_REQUEST = 400;
const NEW_ROW_TYPES = ['break', 'gala'] as const;
// Target running-order rows per editor page; the backend never splits a
// section, so a page may run a little over.
const SECTIONS_PAGE_ROWS = 60;
const POOL_PAGE_SIZE = 100;
const EMPTY_FACETS: UnassignedFacets = { leagues: [], ageCategories: [] };
// Stable references so a query's ?? [] fallback doesn't look like a new
// array to memoized hooks on every render while data is still loading.
const EMPTY_SECTIONS: Section[] = [];
const EMPTY_POSTER: PublicProgramRow[] = [];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SchedulePanel({
  competitionId,
  competition,
  canManage,
  onError,
  onNotice,
}: SchedulePanelProps) {
  // Building the running order only makes sense once entries are final —
  // timing settings (the Таймінги tab) stay open the whole time regardless.
  const status = getCompetitionStatus(competition);
  const registrationOpen =
    status === COMPETITION_STATUS.PLANNED ||
    status === COMPETITION_STATUS.REGISTRATION_OPEN;
  const canBuild = canManage && !registrationOpen;
  const queryClient = useQueryClient();
  const [sectionsPage, setSectionsPage] = useState(0);
  const [poolPage, setPoolPage] = useState(0);
  const [poolLeague, setPoolLeague] = useState('');
  const [poolAge, setPoolAge] = useState('');
  const [dayId, setDayId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [view, setView] = useState<'tech' | 'public'>('tech');
  const [editing, setEditing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [buildOpen, setBuildOpen] = useState(false);
  const [submittingBuild, setSubmittingBuild] = useState(false);
  const [mergeFor, setMergeFor] = useState<Section | null>(null);
  const [merging, setMerging] = useState(false);
  const [clashes, setClashes] = useState<AssignedClash[] | null>(null);
  const [pendingDeleteSection, setPendingDeleteSection] =
    useState<Section | null>(null);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [noMusicOnly, setNoMusicOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newRowType, setNewRowType] = useState<'break' | 'gala'>('break');

  const daysQuery = useQuery({
    queryKey: queryKeys.days(competitionId),
    queryFn: () => getDays(competitionId),
  });
  const venuesQuery = useQuery({
    queryKey: queryKeys.venues(competitionId),
    queryFn: () => getVenues(competitionId),
  });
  const days = daysQuery.data ?? [];
  const venues = venuesQuery.data ?? [];
  // Both settle (success or failure) before the rest of the panel — a
  // viewer needs the day pills too, not just a manager.
  const daysReady = daysQuery.isFetched && venuesQuery.isFetched;

  useEffect(() => {
    if (daysQuery.isError || venuesQuery.isError) {
      onError('Не вдалося завантажити дні та майданчики.');
    }
  }, [daysQuery.isError, venuesQuery.isError, onError]);

  // Open on the first day once days arrive; «Усі дні» afterwards is an
  // explicit choice. A render-phase state adjustment, not an effect — see
  // NewCompetitionPage for the same pattern.
  const [daySeeded, setDaySeeded] = useState(false);
  if (daysQuery.isFetched && !daySeeded) {
    setDaySeeded(true);
    if (!dayId) setDayId(days[0]?.id ?? '');
  }

  const sectionsFilter = {
    dayId: dayId || undefined,
    venueId: venueId || undefined,
    page: sectionsPage,
    pageSize: SECTIONS_PAGE_ROWS,
  };
  const sectionsKey = queryKeys.sections(competitionId, sectionsFilter);
  const sectionsQuery = useQuery({
    queryKey: sectionsKey,
    queryFn: () => getSections(competitionId, sectionsFilter),
    enabled: daysReady && canManage,
  });
  const summaryFilter = { dayId: dayId || undefined };
  const summaryQuery = useQuery({
    queryKey: queryKeys.sectionsSummary(competitionId, summaryFilter),
    queryFn: () => getSectionsSummary(competitionId, summaryFilter),
    enabled: daysReady && canManage,
  });
  const statsFilter = { dayId: dayId || undefined, venueId: venueId || undefined };
  const statsQuery = useQuery({
    queryKey: queryKeys.sectionsStats(competitionId, statsFilter),
    queryFn: () => getSectionsStats(competitionId, statsFilter),
    enabled: daysReady && canManage,
  });

  const sections = sectionsQuery.data?.rows ?? EMPTY_SECTIONS;
  const sectionsMeta = {
    pageCount: sectionsQuery.data?.pageCount ?? 0,
    rangeStart: sectionsQuery.data?.rangeStart ?? 0,
    rangeEnd: sectionsQuery.data?.rangeEnd ?? 0,
    totalSections: sectionsQuery.data?.totalSections ?? 0,
  };
  const daySummary = summaryQuery.data ?? [];
  // Day-wide counters from the server — the section list on screen is only
  // one page of a possibly-500-exit day, so they can't be summed here.
  const stats = {
    perf: statsQuery.data?.performances ?? 0,
    noMusic: statsQuery.data?.noMusic ?? 0,
    end: statsQuery.data?.endTime ?? '',
  };
  const loading = !daysReady || sectionsQuery.isLoading;

  useEffect(() => {
    if (sectionsQuery.isError || summaryQuery.isError || statsQuery.isError) {
      onError('Не вдалося завантажити розклад.');
    }
  }, [sectionsQuery.isError, summaryQuery.isError, statsQuery.isError, onError]);

  // The server clamps an out-of-range page (e.g. after deleting the last
  // section) — follow it so the pager, and the next fetch, stay truthful.
  if (sectionsQuery.data && sectionsQuery.data.page !== sectionsPage) {
    setSectionsPage(sectionsQuery.data.page);
  }

  // The read-only poster: a viewer always needs it, a manager only in the
  // «Публічна» view.
  const posterFilter = { dayId: dayId || undefined, pageSize: SECTIONS_PAGE_ROWS };
  const posterQuery = useQuery({
    queryKey: queryKeys.publicProgram(competitionId, posterFilter),
    queryFn: () => getPublicProgram(competitionId, posterFilter),
    enabled: daysReady && (!canManage || view === 'public'),
    staleTime: TIMING_STALE_TIME_MS,
  });
  // Failure is silent — the editor still renders without the poster.
  const poster = posterQuery.data?.rows ?? EMPTY_POSTER;

  // The unassigned pool is only shown while building.
  const poolFilter = {
    league: poolLeague || undefined,
    ageCategory: poolAge || undefined,
    page: poolPage,
    pageSize: POOL_PAGE_SIZE,
  };
  const poolQuery = useQuery({
    queryKey: queryKeys.unassigned(competitionId, poolFilter),
    queryFn: () => getUnassigned(competitionId, poolFilter),
    enabled: daysReady && canManage && building,
  });
  const facetsQuery = useQuery({
    queryKey: queryKeys.unassignedFacets(competitionId),
    queryFn: () => getUnassignedFacets(competitionId),
    enabled: daysReady && canManage && building,
  });
  const unassigned = poolQuery.data?.rows ?? [];
  const poolTotal = poolQuery.data?.total ?? 0;
  const poolFacets = facetsQuery.data ?? EMPTY_FACETS;

  useEffect(() => {
    if (building && (poolQuery.isError || facetsQuery.isError)) {
      onError('Не вдалося завантажити нерозподілені виходи.');
    }
  }, [building, poolQuery.isError, facetsQuery.isError, onError]);

  const invalidateSections = () =>
    queryClient.invalidateQueries({ queryKey: ['sections', competitionId] });
  const invalidatePool = () =>
    queryClient.invalidateQueries({ queryKey: ['unassigned', competitionId] });

  // "Select all" must reach past the current page — the ids come from the
  // server under the same filter. A one-off action, not cached data.
  const handleSelectAllUnassigned = async () => {
    try {
      const ids = await getUnassignedIds(competitionId, {
        league: poolLeague || undefined,
        ageCategory: poolAge || undefined,
      });
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    } catch {
      onError('Не вдалося обрати всі виходи.');
    }
  };

  const replaceSections = (updated: Section[]) => {
    queryClient.setQueryData<RowPaged<Section>>(sectionsKey, (old) => {
      if (!old) return old;
      const byId = new Map(updated.map((s) => [s.id, s]));
      return { ...old, rows: old.rows.map((s) => byId.get(s.id) ?? s) };
    });
    // An in-place edit can shift the day's end time or no-music count.
    void queryClient.invalidateQueries({ queryKey: ['sections', competitionId, 'stats'] });
  };

  // Changing the day/venue scope starts the pager over.
  const changeDay = (id: string) => {
    setDayId(id);
    setSectionsPage(0);
  };
  const changeVenue = (id: string) => {
    setVenueId(id);
    setSectionsPage(0);
  };

  // The public endpoint has no day param, so scope its rows to the pill
  // the same way the technical view is scoped.
  const posterRows = useMemo(
    () => (dayId ? poster.filter((r) => r.dayId === dayId) : poster),
    [poster, dayId],
  );

  const handleBuild = async (
    name: string,
    startTime: string,
    buildDayId: string,
  ) => {
    if (!buildDayId) return;
    setSubmittingBuild(true);
    setClashes(null);
    try {
      await buildSection(competitionId, {
        dayId: buildDayId,
        venueId: venueId || undefined,
        name,
        startTime,
        entryIds: selectedIds,
      });
      setSelectedIds([]);
      setBuildOpen(false);
      setBuilding(false);
      await invalidateSections();
      await invalidatePool();
    } catch (error) {
      if (error instanceof ApiError && error.status === HTTP_CONFLICT) {
        const payload = error.payload as { assigned?: AssignedClash[] } | null;
        setClashes(payload?.assigned ?? []);
        setBuildOpen(false);
        setPoolPage(0);
        await invalidatePool();
      } else {
        onError('Не вдалося сформувати відділення.');
      }
    } finally {
      setSubmittingBuild(false);
    }
  };

  // Drag-and-drop reorder — the one place with an optimistic update (see
  // .claude/prompt-caching-strategy.md). Only the visual item order changes
  // right away; times, pauses and overlimit flags are server-computed and
  // wait for the recalculated section below.
  const handleReorder = async (sectionId: string, itemIds: string[]) => {
    const previous = queryClient.getQueryData<RowPaged<Section>>(sectionsKey);
    queryClient.setQueryData<RowPaged<Section>>(sectionsKey, (old) =>
      old && {
        ...old,
        rows: old.rows.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: [...s.items].sort(
                  (a, b) => itemIds.indexOf(a.id) - itemIds.indexOf(b.id),
                ),
              }
            : s,
        ),
      },
    );
    try {
      const updated = await reorderSection(competitionId, sectionId, itemIds);
      replaceSections([updated]);
    } catch (error) {
      if (previous) queryClient.setQueryData(sectionsKey, previous);
      if (error instanceof ApiError && error.status === HTTP_BAD_REQUEST) {
        onError('Розклад змінив хтось інший — оновлюю.');
      } else {
        onError('Не вдалося змінити порядок.');
      }
      await invalidateSections();
    }
  };

  const handleReorderSection = async (sectionId: string, dir: -1 | 1) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    try {
      // Reorder needs the day's *complete* section set — the visible list
      // may be filtered by venue or split across pages, so fetch the summary.
      const dayAll = await getSectionsSummary(competitionId, {
        dayId: section.dayId,
      });
      const ids = dayAll
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => s.id);
      const from = ids.indexOf(sectionId);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await reorderSections(competitionId, section.dayId, ids);
      await invalidateSections();
    } catch {
      onError('Не вдалося перемістити відділення.');
      await invalidateSections();
    }
  };

  const handleUpdateRow = async (
    sectionId: string,
    itemId: string,
    patch: { label?: string; durationSeconds?: number },
  ) => {
    try {
      const updated = await updateRow(competitionId, sectionId, itemId, patch);
      replaceSections([updated]);
    } catch {
      onError('Не вдалося змінити рядок.');
    }
  };

  const handleSectionTime = async (sectionId: string, startTime: string) => {
    if (!/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(startTime.trim())) {
      onError('Час має бути у форматі ГГ:ХХ.');
      return;
    }
    try {
      const updated = await updateSection(competitionId, sectionId, {
        startTime: startTime.trim(),
      });
      replaceSections([updated]);
    } catch {
      onError('Не вдалося змінити час початку.');
      await invalidateSections();
    }
  };

  // The other drag-and-drop gesture — moving a card to a different section.
  // Same optimistic treatment: the card jumps to the end of the target
  // section right away, the recalculated order lands in replaceSections.
  const handleMoveExit = async (entryId: string, targetSectionId: string) => {
    const previous = queryClient.getQueryData<RowPaged<Section>>(sectionsKey);
    queryClient.setQueryData<RowPaged<Section>>(sectionsKey, (old) => {
      if (!old) return old;
      let moved: SectionItem | undefined;
      const withoutMoved = old.rows.map((s) => {
        const item = s.items.find((i) => i.exit?.entryId === entryId);
        if (!item) return s;
        moved = item;
        return { ...s, items: s.items.filter((i) => i.id !== item.id) };
      });
      if (!moved) return old;
      const movedItem = moved;
      return {
        ...old,
        rows: withoutMoved.map((s) =>
          s.id === targetSectionId ? { ...s, items: [...s.items, movedItem] } : s,
        ),
      };
    });
    try {
      const { sections: updated } = await moveExit(
        competitionId,
        entryId,
        targetSectionId,
      );
      replaceSections(updated);
    } catch {
      if (previous) queryClient.setQueryData(sectionsKey, previous);
      onError('Не вдалося перенести вихід.');
      await invalidateSections();
    }
  };

  const handleMerge = async (groupKeys: string[], label: string) => {
    if (!mergeFor) return;
    setMerging(true);
    try {
      const updated = await mergeGroups(
        competitionId,
        mergeFor.id,
        groupKeys,
        label,
      );
      replaceSections([updated]);
      setMergeFor(null);
    } catch {
      onError('Не вдалося обʼєднати групи.');
    } finally {
      setMerging(false);
    }
  };

  const handleUnmerge = async (sectionId: string, groupKey: string) => {
    try {
      const updated = await unmergeGroup(competitionId, sectionId, groupKey);
      replaceSections([updated]);
    } catch {
      onError('Не вдалося розʼєднати групу.');
    }
  };

  const handleDeleteSection = async () => {
    if (!pendingDeleteSection) return;
    try {
      await deleteSection(competitionId, pendingDeleteSection.id);
      await invalidateSections();
    } catch {
      onError('Не вдалося видалити відділення.');
    } finally {
      setPendingDeleteSection(null);
    }
  };

  const handleRecalculate = async () => {
    try {
      const { sections: updated } = await recalculateSchedule(competitionId);
      replaceSections(updated);
      onNotice('Розклад перераховано за поточними паузами й лімітами.');
    } catch {
      onError('Не вдалося перерахувати розклад.');
    } finally {
      setRecalcOpen(false);
    }
  };

  const handleAddManualRow = async () => {
    const target = sections[sections.length - 1];
    if (!target) {
      onError('Спершу сформуйте відділення.');
      return;
    }
    try {
      const updated = await addRow(competitionId, target.id, {
        type: newRowType,
        label: newRowType === 'break' ? 'Перерва' : 'Гала-шоу',
        durationSeconds: 600,
      });
      replaceSections([updated]);
    } catch {
      onError('Не вдалося додати рядок.');
    }
  };

  const handleRemoveRow = async (sectionId: string, itemId: string) => {
    try {
      const updated = await deleteRow(competitionId, sectionId, itemId);
      replaceSections([updated]);
    } catch {
      onError('Не вдалося видалити рядок.');
    }
  };

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of sections)
      for (const i of s.items)
        if (i.type === 'performance')
          keys.add(i.nominationGroupKey ?? i.exit?.nomination ?? '—');
    return keys;
  }, [sections]);

  const mergeGroupOptions: GroupOption[] = useMemo(() => {
    if (!mergeFor) return [];
    const seen = new Map<string, string>();
    for (const item of mergeFor.items) {
      if (item.type !== 'performance' || !item.nominationGroupKey) continue;
      if (!seen.has(item.nominationGroupKey)) {
        seen.set(
          item.nominationGroupKey,
          item.mergedGroupLabel ??
            item.exit?.nomination ??
            item.nominationGroupKey,
        );
      }
    }
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
  }, [mergeFor]);

  if (loading && sections.length === 0 && !building) {
    return <p className={styles.empty}>Завантаження розкладу…</p>;
  }

  // A viewer (coach, participant, anyone without team access) always sees
  // the program — just the read-only poster, never the editor.
  if (!canManage) {
    return (
      <div className={styles.panel}>
        {days.length > 1 && (
          <div className={styles.topbar}>
            <span className={styles.kicker}>День</span>
            <button
              type="button"
              className={`${styles.pill} ${dayId === '' ? styles.pillOn : ''}`}
              onClick={() => changeDay('')}
            >
              Усі дні
            </button>
            {days.map((day) => (
              <button
                key={day.id}
                type="button"
                className={`${styles.pill} ${day.id === dayId ? styles.pillOn : ''}`}
                onClick={() => changeDay(day.id)}
              >
                {day.label ?? day.date}
              </button>
            ))}
          </div>
        )}
        <ProgramPoster rows={posterRows} days={days} />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* top bar */}
      <div className={styles.topbar}>
        {days.length > 1 && (
          <>
            <span className={styles.kicker}>День</span>
            <button
              type="button"
              className={`${styles.pill} ${dayId === '' ? styles.pillOn : ''}`}
              onClick={() => changeDay('')}
            >
              Усі дні
            </button>
            {days.map((day) => (
              <button
                key={day.id}
                type="button"
                className={`${styles.pill} ${day.id === dayId ? styles.pillOn : ''}`}
                onClick={() => changeDay(day.id)}
              >
                {day.label ?? day.date}
              </button>
            ))}
          </>
        )}
        {venues.length > 1 && (
          <>
            <span className={styles.kicker}>Майданчик</span>
            <button
              type="button"
              className={`${styles.pill} ${venueId === '' ? styles.pillOn : ''}`}
              onClick={() => changeVenue('')}
            >
              Усі
            </button>
            {venues.map((venue) => (
              <button
                key={venue.id}
                type="button"
                className={`${styles.pill} ${venue.id === venueId ? styles.pillOn : ''}`}
                onClick={() => changeVenue(venue.id)}
              >
                {venue.name}
              </button>
            ))}
          </>
        )}
        <div className={styles.spacer} />
        <button
          type="button"
          className={`${styles.seg} ${styles.segLeft} ${view === 'tech' ? styles.segOn : ''}`}
          onClick={() => setView('tech')}
        >
          Технічна
        </button>
        <button
          type="button"
          className={`${styles.seg} ${styles.segRight} ${view === 'public' ? styles.segOn : ''}`}
          onClick={() => setView('public')}
        >
          Публічна
        </button>
        {view === 'tech' && canBuild && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Готово' : 'Редагувати'}
          </button>
        )}
      </div>

      {!canBuild && (
        <p className={styles.warnLine}>
          Сформувати програму можна після завершення реєстрації (
          {formatDate(competition.registrationTo)}). Паузи й ліміти тривалості
          можна налаштувати вже зараз і будь-коли їх змінювати — на вкладці
          «Таймінги».
        </p>
      )}

      {/* edit panel */}
      {view === 'tech' && canBuild && editing && (
        <div className={styles.editPanel}>
          <div className={styles.rowActions}>
            <select
              className={styles.select}
              value={newRowType}
              onChange={(e) =>
                setNewRowType(e.target.value as 'break' | 'gala')
              }
            >
              {NEW_ROW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'break' ? 'Перерва' : 'Гала-шоу'}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.darkBtn}
              onClick={handleAddManualRow}
            >
              Додати рядок
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => {
                setBuilding(true);
                setPoolPage(0);
              }}
            >
              Сформувати відділення
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setRecalcOpen(true)}
              disabled={sections.length === 0}
            >
              Перерахувати розклад
            </button>
            <div className={styles.spacer} />
            <span className={styles.muted}>
              Правила пауз і лімітів — на вкладці «Таймінги».
            </span>
          </div>
        </div>
      )}

      {clashes && (
        <div className={styles.warnLine}>
          Частину виходів уже розподілено:{' '}
          {clashes
            .map((c) => `№${c.number ?? '?'} (${c.sectionName ?? '—'})`)
            .join(', ')}
          .{' '}
          <button
            type="button"
            className={styles.iconBtnBlue}
            onClick={() => {
              setClashes(null);
              setPoolPage(0);
              void invalidatePool();
            }}
          >
            Оновити пул
          </button>
        </div>
      )}

      {view === 'public' ? (
        <ProgramPoster rows={posterRows} days={days} />
      ) : building ? (
        <div className={styles.buildCols}>
          <UnassignedPool
            exits={unassigned}
            total={poolTotal}
            page={poolPage}
            pageSize={POOL_PAGE_SIZE}
            facets={poolFacets}
            league={poolLeague}
            ageCategory={poolAge}
            onFilterChange={(next) => {
              setPoolLeague(next.league);
              setPoolAge(next.ageCategory);
              setPoolPage(0);
            }}
            onPageChange={setPoolPage}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onSelectAll={handleSelectAllUnassigned}
            onBuild={() => setBuildOpen(true)}
          />
          <div>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setBuilding(false)}
            >
              ← До програми
            </button>
          </div>
        </div>
      ) : sections.length === 0 ? (
        <div className={styles.empty}>
          {canBuild ? (
            <>
              Відділень ще немає.{' '}
              <button
                type="button"
                className={styles.iconBtnBlue}
                onClick={() => {
                  setBuilding(true);
                  setPoolPage(0);
                }}
              >
                Сформувати перше
              </button>
            </>
          ) : (
            'Відділень ще немає.'
          )}
        </div>
      ) : (
        <>
          <div className={styles.counters}>
            <div className={`${styles.stat} ${styles.statBlue}`}>
              <div className={styles.statNum}>{stats.perf}</div>
              <div className={styles.statLabel}>виступів</div>
            </div>
            <div className={`${styles.stat} ${styles.statPlain}`}>
              <div className={styles.statNum}>
                {stats.end ? formatClock(stats.end) : '—'}
              </div>
              <div className={styles.statLabel}>орієнтовне завершення</div>
            </div>
            {view === 'tech' && (
              <div className={`${styles.stat} ${styles.statAmber}`}>
                <div className={styles.statNum}>{stats.noMusic}</div>
                <div className={styles.statLabel}>без музики</div>
              </div>
            )}
          </div>

          <div className={styles.filterRow}>
            <input
              className={styles.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за номером, прізвищем, студією…"
            />
            {view === 'tech' && (
              <button
                type="button"
                className={`${styles.pill} ${noMusicOnly ? styles.pillOn : ''}`}
                onClick={() => setNoMusicOnly((v) => !v)}
              >
                Без музики
              </button>
            )}
            <div className={styles.vrule} />
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setCollapsed(new Set(allGroupKeys))}
            >
              Згорнути всі
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setCollapsed(new Set())}
            >
              Розгорнути
            </button>
          </div>

          {sectionsMeta.pageCount > 1 && (
            <div className={styles.filterRow}>
              <button
                type="button"
                className={styles.ghostBtn}
                disabled={sectionsPage <= 0}
                onClick={() => setSectionsPage((p) => Math.max(0, p - 1))}
              >
                ‹ Попередні
              </button>
              <span className={styles.muted}>
                Відділення {sectionsMeta.rangeStart}–{sectionsMeta.rangeEnd} з{' '}
                {sectionsMeta.totalSections}
              </span>
              <button
                type="button"
                className={styles.ghostBtn}
                disabled={sectionsPage >= sectionsMeta.pageCount - 1}
                onClick={() =>
                  setSectionsPage((p) =>
                    Math.min(sectionsMeta.pageCount - 1, p + 1),
                  )
                }
              >
                Наступні ›
              </button>
            </div>
          )}

          <ProgramTable
            sections={sections}
            sectionSummaries={daySummary}
            days={days}
            view={view}
            editing={editing}
            search={search}
            hideWithMusic={noMusicOnly}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            onReorderItems={handleReorder}
            onReorderSection={handleReorderSection}
            onSectionTime={handleSectionTime}
            onUpdateRow={handleUpdateRow}
            onRemoveRow={handleRemoveRow}
            onMoveExit={handleMoveExit}
            onMergeSection={setMergeFor}
            onUnmerge={handleUnmerge}
            onDeleteSection={(id) =>
              setPendingDeleteSection(sections.find((s) => s.id === id) ?? null)
            }
          />
        </>
      )}

      <BuildSectionModal
        open={buildOpen}
        defaultName={`Відділення ${sections.length + 1}`}
        exitCount={selectedIds.length}
        days={days}
        defaultDayId={dayId}
        submitting={submittingBuild}
        onCancel={() => setBuildOpen(false)}
        onSubmit={handleBuild}
      />

      <MergeGroupsModal
        open={mergeFor !== null}
        groups={mergeGroupOptions}
        submitting={merging}
        onCancel={() => setMergeFor(null)}
        onSubmit={handleMerge}
      />

      <ConfirmDialog
        open={pendingDeleteSection !== null}
        title="Видалити відділення?"
        description={
          pendingDeleteSection
            ? `Виходи з «${pendingDeleteSection.name}» повернуться до нерозподілених.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDeleteSection(null)}
        onConfirm={handleDeleteSection}
      />

      <ConfirmDialog
        open={recalcOpen}
        title="Перерахувати розклад?"
        description="Час виступів може зсунутися відповідно до поточних пауз і лімітів."
        confirmLabel="Перерахувати"
        onCancel={() => setRecalcOpen(false)}
        onConfirm={handleRecalculate}
      />
    </div>
  );
}
