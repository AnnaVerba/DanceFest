import { Fragment, useMemo, useState } from 'react';
import KebabMenu from '../KebabMenu';
import type { Venue } from '../../../lib/venues';
import {
  EXIT_BLOCK_KEY_SEPARATOR,
  FOREIGN_VENUE_WARNING_HINT,
  FOREIGN_VENUE_WARNING_PREFIX,
  MANUAL_ROW_LABEL_DRAFT_PREFIX,
  MANUAL_ROW_LABEL_PLACEHOLDER,
  MANUAL_ROW_LABEL_SEPARATOR,
  MERGED_BLOCK_KEY_PREFIX,
  VENUE_LIST_SEPARATOR,
} from './programTable.constants';
import type { BlockRename } from './blockRename.types';
import type { SectionCollapse } from './sectionCollapse.types';
import { isSectionCollapsed } from './sectionCollapse';
import type {
  CompetitionDay,
  Section,
  SectionItem,
  SectionSummary,
} from '../../../lib/schedule';
import { ROW_TYPE_LABELS } from '../../../lib/schedule';
import type { NominationToMove } from './nominationToMove.types';
import type { ProgramBlock } from './programBlock.types';
import { MOVE_NOMINATION_TITLE } from './sectionPicker.constants';
import { formatMarkedParticipantNumbers } from '../../../lib/participantNumbers';
import { formatClock, formatDuration } from '../../../lib/duration';
import { opensProgram, programHeading } from '../../../lib/programHeading';
import {
  NOMINATION_NUMBER_MARK,
  PARTICIPANT_NUMBER_MARK,
} from '../../../lib/programNumbers.constants';
import { formatMarkedNominationNumber } from '../../../lib/programNumbers';
import DurationMarks from '../../program/DurationMarks';
import { formatLeaders } from '../../../lib/programRowFormat';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableBlockBody from './SortableBlockBody';
import BlockDragHandle from './BlockDragHandle';
import { BLOCK_DRAG_ACTIVATION_DISTANCE_PX } from './sortableBlock.constants';
import styles from './program.module.css';

interface ProgramTableProps {
  sections: Section[];
  // Every section of the day (id + name) — the move-exit menu needs the
  // whole day, not just the sections on the current page.
  sectionSummaries: SectionSummary[];
  days: CompetitionDay[];
  venues: Venue[];
  view: 'tech' | 'public';
  editing: boolean;
  search: string;
  hideWithMusic: boolean;
  collapsed: Set<string>;
  onToggleCollapse: (key: string) => void;
  sectionCollapse: SectionCollapse;
  onToggleSection: (sectionId: string) => void;
  onReorderItems: (sectionId: string, itemIds: string[]) => void;
  onReorderSection: (sectionId: string, dir: -1 | 1) => void;
  onSectionTime: (sectionId: string, startTime: string) => void;
  onUpdateRow: (
    sectionId: string,
    itemId: string,
    patch: { label?: string; durationSeconds?: number },
  ) => void;
  onRemoveRow: (sectionId: string, itemId: string) => void;
  onMoveExit: (entryId: string, targetSectionId: string) => void;
  onMergeSection: (section: Section) => void;
  onUnmerge: (sectionId: string, groupKey: string) => void;
  onMoveNomination: (nomination: NominationToMove) => void;
  onRenameBlock: (rename: BlockRename) => void;
  onDeleteSection: (sectionId: string) => void;
}

function groupKeyOf(item: SectionItem): string {
  return item.nominationGroupKey ?? item.exit?.nomination ?? '—';
}
// Merged groups share one block (TASK-15); any other group splits by its
// exit label, so each program of a per-program nomination is its own block —
// the same headers the public program shows (see buildPublicProgram).
function blockKeyOf(item: SectionItem): string {
  return item.mergedGroupLabel
    ? `${MERGED_BLOCK_KEY_PREFIX}${item.mergedGroupLabel}`
    : `${groupKeyOf(item)}${EXIT_BLOCK_KEY_SEPARATOR}${groupLabelOf(item)}`;
}
function groupLabelOf(item: SectionItem): string {
  return item.mergedGroupLabel ?? item.exit?.nomination ?? '—';
}
function toMinutes(seconds: number | null): number {
  return seconds == null ? 0 : Math.max(1, Math.round(seconds / 60));
}
// Walk items in running order and bucket consecutive performances sharing a
// block key together; every other row is its own singleton group. Shared by
// rendering (which labels each group) and block move (which reorders them).
function groupSectionItems(items: SectionItem[]): SectionItem[][] {
  const groups: SectionItem[][] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (
      item.type === 'performance' &&
      last &&
      last[0].type === 'performance' &&
      blockKeyOf(last[0]) === blockKeyOf(item)
    ) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

export default function ProgramTable({
  sections,
  sectionSummaries,
  days,
  venues,
  view,
  editing,
  search,
  hideWithMusic,
  collapsed,
  onToggleCollapse,
  sectionCollapse,
  onToggleSection,
  onReorderItems,
  onReorderSection,
  onSectionTime,
  onUpdateRow,
  onRemoveRow,
  onMoveExit,
  onMergeSection,
  onUnmerge,
  onMoveNomination,
  onRenameBlock,
  onDeleteSection,
}: ProgramTableProps) {
  const tech = view === 'tech';
  const needle = search.trim().toLowerCase();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: BLOCK_DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const colCount = tech ? 8 : 6;
  const dayLabel = (id: string) => {
    const day = days.find((d) => d.id === id);
    return day ? (day.label ?? day.date) : '';
  };
  const venueNames = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue.name])),
    [venues],
  );
  const venueNameOf = (venueId: string | null) =>
    venueId === null ? undefined : venueNames.get(venueId);

  const draft = (key: string, fallback: string) => drafts[key] ?? fallback;
  const setDraft = (key: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: value }));

  // Display filter only. Reorder logic always uses the full section.items,
  // so a filtered-out row never drops out of the itemIds we send back.
  const matches = (item: SectionItem) => {
    if (hideWithMusic && item.type === 'performance' && item.exit?.musicName) {
      return false;
    }
    if (!needle) return true;
    return [
      item.exit?.number,
      ...(item.exit?.participantNumbers ?? []),
      item.exit?.routineName,
      item.exit?.studioName,
      item.exit?.choreographer,
      item.exit?.instructorName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle);
  };

  const moveItem = (section: Section, itemId: string, dir: -1 | 1) => {
    const movable = section.items.filter((i) => i.type !== 'award');
    const ids = movable.map((i) => i.id);
    const from = ids.indexOf(itemId);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    const award = section.items.find((i) => i.type === 'award');
    onReorderItems(section.id, award ? [...ids, award.id] : ids);
  };

  // A section's movable blocks (single rows or whole nominations) as item
  // ids, the pinned award row left out.
  const movableBlocks = (section: Section) =>
    groupSectionItems(section.items.filter((i) => i.type !== 'award')).map(
      (items) => items.map((i) => i.id),
    );
  const blockIndexOf = (section: Section, firstItemId: string) =>
    movableBlocks(section).findIndex((ids) => ids[0] === firstItemId);

  // Moves a whole block to another position within the same section; the
  // award stays last.
  const moveBlockTo = (section: Section, from: number, to: number) => {
    const groups = movableBlocks(section);
    if (from < 0 || to < 0 || to >= groups.length || from === to) return;
    const ids = arrayMove(groups, from, to).flat();
    const award = section.items.find((i) => i.type === 'award');
    onReorderItems(section.id, award ? [...ids, award.id] : ids);
  };

  // Swaps a whole nomination block with the adjacent block, one step at a
  // time — same up/down convention as moveItem.
  const moveBlock = (section: Section, blockItemIds: string[], dir: -1 | 1) => {
    const from = blockIndexOf(section, blockItemIds[0]);
    moveBlockTo(section, from, from + dir);
  };

  // A block dropped onto another block's place in the same section.
  const dropBlock = (section: Section, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    moveBlockTo(
      section,
      blockIndexOf(section, String(active.id)),
      blockIndexOf(section, String(over.id)),
    );
  };

  const rowActions = (buttons: React.ReactNode) =>
    tech ? <td className={`${styles.td} ${styles.tdActions}`}>{buttons}</td> : null;

  // A row's clock time; a section's start is editable in edit mode.
  const renderTime = (
    section: Section,
    time: string,
    editableTimeKey?: string,
  ) =>
    editing && editableTimeKey ? (
      <input
        className={styles.timeInput}
        value={draft(editableTimeKey, section.startTime)}
        onChange={(e) => setDraft(editableTimeKey, e.target.value)}
        onBlur={() =>
          onSectionTime(section.id, draft(editableTimeKey, section.startTime))
        }
      />
    ) : (
      <span style={{ fontWeight: 600, color: '#1d4ed8' }}>
        {formatClock(time)}
      </span>
    );

  const renderServiceRow = (opts: {
    key: string;
    section: Section;
    label: React.ReactNode;
    time: string;
    editableTimeKey?: string;
    durationSeconds?: number | null;
    editableDurationItemId?: string;
    actions?: React.ReactNode;
  }) => (
    <tr key={opts.key} className={styles.serviceRow}>
      <td className={styles.serviceCell} />
      <td className={styles.serviceLabel} colSpan={4}>
        {opts.label}
      </td>
      <td className={styles.serviceCell}>
        {renderTime(opts.section, opts.time, opts.editableTimeKey)}
      </td>
      {tech && (
        <>
          <td className={styles.serviceCell}>
            {opts.editableDurationItemId && editing ? (
              <span>
                <input
                  className={styles.chipInput}
                  type="number"
                  value={draft(
                    `d-${opts.editableDurationItemId}`,
                    String(toMinutes(opts.durationSeconds ?? null)),
                  )}
                  onChange={(e) =>
                    setDraft(`d-${opts.editableDurationItemId}`, e.target.value)
                  }
                  onBlur={() => {
                    const min = Number(
                      draft(
                        `d-${opts.editableDurationItemId}`,
                        String(toMinutes(opts.durationSeconds ?? null)),
                      ),
                    );
                    if (Number.isFinite(min) && min > 0) {
                      onUpdateRow(opts.section.id, opts.editableDurationItemId!, {
                        durationSeconds: Math.round(min * 60),
                      });
                    }
                  }}
                />{' '}
                хв
              </span>
            ) : opts.durationSeconds != null ? (
              `${toMinutes(opts.durationSeconds)} хв`
            ) : (
              ''
            )}
          </td>
          {rowActions(opts.actions ?? null)}
        </>
      )}
    </tr>
  );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: 44 }}>
              {NOMINATION_NUMBER_MARK}
            </th>
            <th className={styles.th} style={{ width: 52 }}>
              {PARTICIPANT_NUMBER_MARK}
            </th>
            <th className={styles.th} style={{ minWidth: 170 }}>
              Прізвище Імʼя
            </th>
            <th className={styles.th} style={{ minWidth: 150 }}>
              Керівник
            </th>
            <th className={styles.th} style={{ minWidth: 130 }}>
              Студія
            </th>
            <th className={styles.th} style={{ width: 96 }}>
              Час
            </th>
            {tech && (
              <>
                <th className={styles.th} style={{ width: 96 }}>
                  Тривалість
                </th>
                <th className={styles.th} style={{ width: 108 }} />
              </>
            )}
          </tr>
        </thead>
          {sections.map((section, sectionIndex) => {
            // Walk items in running order so a break inserted between two
            // nomination groups renders at its real place, not at the end.
            const blocks: ProgramBlock[] = groupSectionItems(
              section.items,
            ).map((items) => {
              const first = items[0];
              if (first.type === 'award') return { kind: 'award', item: first };
              if (first.type !== 'performance') {
                return { kind: 'manual', item: first };
              }
              return {
                kind: 'group',
                key: blockKeyOf(first),
                label: groupLabelOf(first),
                items,
              };
            });
            // Move-block ↑/↓ swaps with the adjacent block, excluding the
            // pinned award row — same movable set moveBlock() reorders.
            const moveGroups = groupSectionItems(
              section.items.filter((i) => i.type !== 'award'),
            );

            // An exit moves only within its own venue's program.
            const other = sectionSummaries
              .filter((s) => s.id !== section.id)
              .map((s) => ({ id: s.id, name: s.name, venueId: s.venueId }));
            const targetsFor = (exitVenueId: string | null) =>
              other.filter(
                (t) => !exitVenueId || !t.venueId || t.venueId === exitVenueId,
              );
            const foreignVenues = [
              ...new Set(
                section.items
                  .map((it) => it.exit?.venueId ?? null)
                  .filter(
                    (id): id is string =>
                      id !== null && id !== section.venueId,
                  ),
              ),
            ];
            const mixed = section.venueId
              ? foreignVenues.length > 0
              : foreignVenues.length > 1;
            const newProgram = opensProgram(
              section,
              sections[sectionIndex - 1],
            );
            // Section reorder acts within one venue's day program, so the
            // arrows are disabled at that program's edges.
            const sameDay = sections.filter(
              (s) =>
                s.dayId === section.dayId && s.venueId === section.venueId,
            );
            const dayPos = sameDay.findIndex((s) => s.id === section.id);
            // Column F: the category's position among this section's
            // category blocks, independent of the search filter below.
            let categoryNumber = 0;
            // A search opens every section, so a hit is never hidden —
            // as in the public program.
            const sectionCollapsed =
              !needle && isSectionCollapsed(sectionCollapse, section.id);

            return (
              <Fragment key={section.id}>
                <tbody>
                {newProgram && (
                  <tr className={styles.dayRow}>
                    <td colSpan={colCount}>
                      {programHeading(
                        dayLabel(section.dayId),
                        section.venueId,
                        venueNames,
                      )}
                    </td>
                  </tr>
                )}
                {renderServiceRow({
                  key: `s-${section.id}`,
                  section,
                  label: (
                    <span className={styles.sectionTitle}>
                      <button
                        type="button"
                        className={styles.collapseBtn}
                        onClick={() => onToggleSection(section.id)}
                      >
                        {sectionCollapsed ? '▸' : '▾'}
                      </button>{' '}
                      {section.name}
                    </span>
                  ),
                  time: section.startsAt,
                  editableTimeKey: `t-${section.id}`,
                  actions: editing && (
                    <>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        disabled={dayPos <= 0}
                        onClick={() => onReorderSection(section.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        disabled={dayPos === sameDay.length - 1}
                        onClick={() => onReorderSection(section.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtnBlue}
                        title="Обʼєднати групи"
                        onClick={() => onMergeSection(section)}
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtnDanger}
                        title="Видалити відділення"
                        onClick={() => onDeleteSection(section.id)}
                      >
                        ✕
                      </button>
                    </>
                  ),
                })}

                {mixed && (
                  <tr className={styles.warnRow}>
                    <td colSpan={colCount}>
                      {FOREIGN_VENUE_WARNING_PREFIX}{' '}
                      {foreignVenues
                        .map((id) => venueNameOf(id) ?? id)
                        .join(VENUE_LIST_SEPARATOR)}
                      {FOREIGN_VENUE_WARNING_HINT}
                    </td>
                  </tr>
                )}
                </tbody>

                {!sectionCollapsed && (
                  <DndContext
                    sensors={dragSensors}
                    collisionDetection={closestCenter}
                    // Its screen-reader texts are <div>s, which a table may
                    // not hold — they go to the page body instead.
                    accessibility={{ container: document.body }}
                    onDragEnd={(event) => dropBlock(section, event)}
                  >
                  <SortableContext
                    items={moveGroups.map((g) => g[0].id)}
                    strategy={verticalListSortingStrategy}
                  >
                  {blocks.map((block) => {
                  if (block.kind === 'award') {
                    return (
                      <tbody key={block.item.id}>
                        {renderServiceRow({
                          key: block.item.id,
                          section,
                          label: 'Нагородження',
                          time: block.item.time,
                        })}
                      </tbody>
                    );
                  }
                  if (block.kind === 'manual') {
                    const item = block.item;
                    const typeLabel =
                      ROW_TYPE_LABELS[item.type as 'break' | 'gala'];
                    const labelKey = `${MANUAL_ROW_LABEL_DRAFT_PREFIX}${item.id}`;
                    return (
                      <SortableBlockBody key={item.id} id={item.id} disabled={!editing}>
                      {renderServiceRow({
                      key: item.id,
                      section,
                      label: editing ? (
                        <>
                          {typeLabel}
                          {MANUAL_ROW_LABEL_SEPARATOR}
                          <input
                            className={styles.titleInput}
                            placeholder={MANUAL_ROW_LABEL_PLACEHOLDER}
                            value={draft(labelKey, item.label ?? '')}
                            onChange={(e) => setDraft(labelKey, e.target.value)}
                            onBlur={() => {
                              const label = draft(labelKey, item.label ?? '').trim();
                              if (!label || label === item.label) return;
                              onUpdateRow(section.id, item.id, { label });
                            }}
                          />
                        </>
                      ) : (
                        `${typeLabel}${
                          item.label
                            ? `${MANUAL_ROW_LABEL_SEPARATOR}${item.label}`
                            : ''
                        }`
                      ),
                      time: item.time,
                      durationSeconds: item.durationSeconds,
                      editableDurationItemId: item.id,
                      actions: editing && (
                        <>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => moveItem(section, item.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => moveItem(section, item.id, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtnDanger}
                            onClick={() => onRemoveRow(section.id, item.id)}
                          >
                            ✕
                          </button>
                        </>
                      ),
                    })}
                      </SortableBlockBody>
                    );
                  }
                  const group = block;
                  categoryNumber += 1;
                  const number = categoryNumber;
                  const visible = group.items.filter(matches);
                  if (visible.length === 0) return null;
                  const isCollapsed = collapsed.has(group.key);
                  const merged = group.items[0]?.mergedGroupLabel != null;
                  // The block's own nomination group — for move, unmerge and
                  // rename, which the server resolves per group key.
                  const firstKey = groupKeyOf(group.items[0]);
                  const nominationId =
                    group.items[0]?.exit?.nominationId ?? null;
                  const titleKey = `n-${section.id}-${group.key}`;
                  // A merged group can span nominations on different venues.
                  const groupVenues = [
                    ...new Set(
                      group.items
                        .map((it) => venueNameOf(it.exit?.venueId ?? null))
                        .filter((name): name is string => name !== undefined),
                    ),
                  ];
                  const blockSeconds = group.items.reduce(
                    (sum, it) => sum + (it.durationSeconds ?? 0),
                    0,
                  );
                  const moveGroupIndex = moveGroups.findIndex(
                    (g) => g[0].id === group.items[0].id,
                  );
                  return (
                    // Keyed by its first item, so a block keeps its identity
                    // (and its drag animation) as the order changes.
                    <SortableBlockBody
                      key={group.items[0].id}
                      id={group.items[0].id}
                      disabled={!editing}
                    >
                      <tr className={styles.blockRow}>
                        <td className={styles.blockF}>
                          {formatMarkedNominationNumber(number)}
                        </td>
                        <td className={styles.blockCell} colSpan={4}>
                          <div className={styles.blockHead}>
                            {editing && <BlockDragHandle />}
                            <button
                              type="button"
                              className={styles.collapseBtn}
                              onClick={() => onToggleCollapse(group.key)}
                            >
                              {isCollapsed ? '▸' : '▾'}
                            </button>
                            {editing && (merged || nominationId) ? (
                              <input
                                className={styles.titleInput}
                                value={draft(titleKey, group.label)}
                                onChange={(e) =>
                                  setDraft(titleKey, e.target.value)
                                }
                                onBlur={() => {
                                  const label = draft(
                                    titleKey,
                                    group.label,
                                  ).trim();
                                  if (!label || label === group.label) return;
                                  onRenameBlock({
                                    sectionId: section.id,
                                    groupKey: firstKey,
                                    merged,
                                    nominationId,
                                    label,
                                  });
                                }}
                              />
                            ) : (
                              <span className={styles.blockTitle}>
                                {group.label}
                              </span>
                            )}
                            <span className={styles.count}>
                              {group.items.length}
                            </span>
                            {groupVenues.length > 0 && (
                              <span
                                className={`${styles.badge} ${styles.badgeVenue}`}
                              >
                                {groupVenues.join(VENUE_LIST_SEPARATOR)}
                              </span>
                            )}
                            {merged && (
                              <span
                                className={`${styles.badge} ${styles.badgeMerged}`}
                              >
                                обʼєднано
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={styles.blockCell}>
                          {renderTime(section, group.items[0].time)}
                        </td>
                        {tech && (
                          <>
                            <td
                              className={styles.blockCell}
                              style={{ fontWeight: 600, color: '#475569' }}
                            >
                              {formatDuration(blockSeconds)}
                            </td>
                            <td
                              className={`${styles.blockCell} ${styles.tdActions}`}
                            >
                              {editing && (
                                <>
                                  <button
                                    type="button"
                                    className={styles.iconBtn}
                                    title="Перемістити номінацію вгору"
                                    disabled={moveGroupIndex <= 0}
                                    onClick={() =>
                                      moveBlock(
                                        section,
                                        group.items.map((i) => i.id),
                                        -1,
                                      )
                                    }
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.iconBtn}
                                    title="Перемістити номінацію вниз"
                                    disabled={
                                      moveGroupIndex === moveGroups.length - 1
                                    }
                                    onClick={() =>
                                      moveBlock(
                                        section,
                                        group.items.map((i) => i.id),
                                        1,
                                      )
                                    }
                                  >
                                    ↓
                                  </button>
                                </>
                              )}
                              {editing && !merged && (
                                <button
                                  type="button"
                                  className={styles.iconBtnBlue}
                                  title={MOVE_NOMINATION_TITLE}
                                  onClick={() =>
                                    onMoveNomination({
                                      groupKey: firstKey,
                                      label:
                                        group.items[0]?.exit?.nomination ??
                                        group.label,
                                      dayId: section.dayId,
                                    })
                                  }
                                >
                                  ⇆
                                </button>
                              )}
                              {editing && merged && (
                                <button
                                  type="button"
                                  className={styles.iconBtnBlue}
                                  title="Розʼєднати"
                                  onClick={() =>
                                    onUnmerge(section.id, firstKey)
                                  }
                                >
                                  ⇤⇥
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>

                      {!isCollapsed &&
                        visible.map((item) => (
                          <tr key={item.id} className={styles.perfRow}>
                            <td className={styles.td} />
                            <td className={`${styles.td} ${styles.tdNum}`}>
                              {formatMarkedParticipantNumbers(
                                item.exit?.participantNumbers ?? [],
                              )}
                            </td>
                            <td className={`${styles.td} ${styles.tdName}`}>
                              {item.exit?.routineName ?? '—'}
                            </td>
                            <td className={styles.td}>
                              {(item.exit && formatLeaders(item.exit)) || '—'}
                            </td>
                            <td className={styles.td}>
                              {item.exit?.studioName ?? '—'}
                            </td>
                            <td className={styles.td}>
                              {tech ? formatClock(item.time, true) : ''}
                            </td>
                            {tech && (
                              <>
                                <td className={`${styles.td} ${styles.tdNum}`}>
                                  {formatDuration(item.durationSeconds)}
                                  <div className={styles.durationMarks}>
                                    <DurationMarks
                                      overageSeconds={item.overageSeconds}
                                      purchasedSeconds={
                                        item.exit?.purchasedExtraSeconds ?? 0
                                      }
                                    />
                                  </div>
                                </td>
                                <td
                                  className={`${styles.td} ${styles.tdActions}`}
                                >
                                  {editing && (
                                    <>
                                      <button
                                        type="button"
                                        className={styles.iconBtn}
                                        onClick={() =>
                                          moveItem(section, item.id, -1)
                                        }
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.iconBtn}
                                        onClick={() =>
                                          moveItem(section, item.id, 1)
                                        }
                                      >
                                        ↓
                                      </button>
                                      {item.exit &&
                                        targetsFor(item.exit.venueId).length >
                                          0 && (
                                        <KebabMenu
                                          items={targetsFor(
                                            item.exit.venueId,
                                          ).map((t) => ({
                                            label: `→ «${t.name}»`,
                                            onSelect: () =>
                                              item.exit &&
                                              onMoveExit(
                                                item.exit.entryId,
                                                t.id,
                                              ),
                                          }))}
                                        />
                                      )}
                                    </>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                    </SortableBlockBody>
                  );
                })}
                  </SortableContext>
                  </DndContext>
                )}
              </Fragment>
            );
          })}
      </table>
    </div>
  );
}
