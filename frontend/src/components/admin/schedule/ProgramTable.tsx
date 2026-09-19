import { Fragment, useMemo, useState } from 'react';
import KebabMenu from '../KebabMenu';
import type { Venue } from '../../../lib/venues';
import {
  FOREIGN_VENUE_WARNING_HINT,
  FOREIGN_VENUE_WARNING_PREFIX,
  VENUE_LIST_SEPARATOR,
} from './programTable.constants';
import type {
  CompetitionDay,
  Section,
  SectionItem,
  SectionSummary,
} from '../../../lib/schedule';
import { ROW_TYPE_LABELS } from '../../../lib/schedule';
import type { NominationToMove } from './nominationToMove.types';
import { MOVE_NOMINATION_TITLE } from './sectionPicker.constants';
import { formatParticipantNumbers } from '../../../lib/participantNumbers';
import { formatClock, formatDuration } from '../../../lib/duration';
import { opensProgram, programHeading } from '../../../lib/programHeading';
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
  onDeleteSection: (sectionId: string) => void;
}

function groupKeyOf(item: SectionItem): string {
  return item.nominationGroupKey ?? item.exit?.nomination ?? '—';
}
function groupLabelOf(item: SectionItem): string {
  return item.mergedGroupLabel ?? item.exit?.nomination ?? '—';
}
function toMinutes(seconds: number | null): number {
  return seconds == null ? 0 : Math.max(1, Math.round(seconds / 60));
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
  onReorderItems,
  onReorderSection,
  onSectionTime,
  onUpdateRow,
  onRemoveRow,
  onMoveExit,
  onMergeSection,
  onUnmerge,
  onMoveNomination,
  onDeleteSection,
}: ProgramTableProps) {
  const tech = view === 'tech';
  const needle = search.trim().toLowerCase();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const colCount = tech ? 9 : 6;
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

  const rowActions = (buttons: React.ReactNode) =>
    tech ? <td className={`${styles.td} ${styles.tdActions}`}>{buttons}</td> : null;

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
        {editing && opts.editableTimeKey ? (
          <input
            className={styles.timeInput}
            value={draft(opts.editableTimeKey, opts.section.startTime)}
            onChange={(e) => setDraft(opts.editableTimeKey!, e.target.value)}
            onBlur={() =>
              onSectionTime(
                opts.section.id,
                draft(opts.editableTimeKey!, opts.section.startTime),
              )
            }
          />
        ) : (
          <span style={{ fontWeight: 600, color: '#1d4ed8' }}>
            {formatClock(opts.time)}
          </span>
        )}
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
          <td className={styles.serviceCell} />
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
              F
            </th>
            <th className={styles.th} style={{ width: 52 }}>
              №
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
                <th className={styles.th} style={{ width: 160 }}>
                  Переплати
                </th>
                <th className={styles.th} style={{ width: 108 }} />
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sectionIndex) => {
            // Walk items in running order so a break inserted between two
            // nomination groups renders at its real place, not at the end.
            type Block =
              | { kind: 'group'; key: string; label: string; items: SectionItem[] }
              | { kind: 'manual'; item: SectionItem }
              | { kind: 'award'; item: SectionItem };
            const blocks: Block[] = [];
            for (const item of section.items) {
              if (item.type === 'performance') {
                const key = groupKeyOf(item);
                const last = blocks[blocks.length - 1];
                if (last && last.kind === 'group' && last.key === key) {
                  last.items.push(item);
                } else {
                  blocks.push({
                    kind: 'group',
                    key,
                    label: groupLabelOf(item),
                    items: [item],
                  });
                }
              } else if (item.type === 'award') {
                blocks.push({ kind: 'award', item });
              } else {
                blocks.push({ kind: 'manual', item });
              }
            }

            const sectionStart = section.startsAt;
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

            return (
              <Fragment key={section.id}>
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
                  label: section.name,
                  time: sectionStart,
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

                {blocks.map((block, blockIndex) => {
                  if (block.kind === 'award') {
                    return renderServiceRow({
                      key: block.item.id,
                      section,
                      label: 'Нагородження',
                      time: block.item.time,
                    });
                  }
                  if (block.kind === 'manual') {
                    const item = block.item;
                    return renderServiceRow({
                      key: item.id,
                      section,
                      label: `${
                        ROW_TYPE_LABELS[item.type as 'break' | 'gala']
                      }${item.label ? ` · ${item.label}` : ''}`,
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
                    });
                  }
                  const group = block;
                  categoryNumber += 1;
                  const number = categoryNumber;
                  const visible = group.items.filter(matches);
                  if (visible.length === 0) return null;
                  const isCollapsed = collapsed.has(group.key);
                  const merged = group.items[0]?.mergedGroupLabel != null;
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
                  return (
                    // A manual row can split one nomination group into two
                    // blocks with the same group.key — index keeps them apart.
                    <Fragment key={`${group.key}-${blockIndex}`}>
                      <tr className={styles.blockRow}>
                        <td className={styles.blockF}>{number}</td>
                        <td className={styles.blockCell} colSpan={5}>
                          <div className={styles.blockHead}>
                            <button
                              type="button"
                              className={styles.collapseBtn}
                              onClick={() => onToggleCollapse(group.key)}
                            >
                              {isCollapsed ? '▸' : '▾'}
                            </button>
                            <span className={styles.blockTitle}>
                              {group.label}
                            </span>
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
                        {tech && (
                          <>
                            <td
                              className={styles.blockCell}
                              style={{ fontWeight: 600, color: '#475569' }}
                            >
                              {formatDuration(blockSeconds)}
                            </td>
                            <td className={styles.blockCell} />
                            <td
                              className={`${styles.blockCell} ${styles.tdActions}`}
                            >
                              {editing && (
                                <button
                                  type="button"
                                  className={styles.iconBtnBlue}
                                  title={MOVE_NOMINATION_TITLE}
                                  onClick={() =>
                                    onMoveNomination({
                                      groupKey: group.key,
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
                                    onUnmerge(section.id, group.key)
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
                              {formatParticipantNumbers(
                                item.exit?.participantNumbers ?? [],
                              )}
                            </td>
                            <td className={`${styles.td} ${styles.tdName}`}>
                              {item.exit?.routineName ?? '—'}
                            </td>
                            <td className={styles.td}>
                              {item.exit?.choreographer ?? '—'}
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
                                </td>
                                <td className={styles.td} />
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
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
