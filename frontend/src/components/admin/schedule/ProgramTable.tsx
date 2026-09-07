import { Fragment, useState } from 'react';
import KebabMenu from '../KebabMenu';
import type {
  CompetitionDay,
  Section,
  SectionItem,
  SectionSummary,
} from '../../../lib/schedule';
import { ROW_TYPE_LABELS } from '../../../lib/schedule';
import { formatClock, formatDuration } from '../../../lib/duration';
import styles from './program.module.css';

interface ProgramTableProps {
  sections: Section[];
  // Every section of the day (id + name) — the move-exit menu needs the
  // whole day, not just the sections on the current page.
  sectionSummaries: SectionSummary[];
  days: CompetitionDay[];
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
  const showDayRows = new Set(sections.map((s) => s.dayId)).size > 1;

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
              Тренер
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

            const sectionStart =
              section.items[0]?.time ?? `${section.startTime}:00`;
            const other = sectionSummaries
              .filter((s) => s.id !== section.id)
              .map((s) => ({ id: s.id, name: s.name }));
            const newDay =
              showDayRows &&
              sections[sectionIndex - 1]?.dayId !== section.dayId;
            // Section reorder acts within a day, so the arrows must be
            // disabled at the day's edges, not the whole list's.
            const sameDay = sections.filter((s) => s.dayId === section.dayId);
            const dayPos = sameDay.findIndex((s) => s.id === section.id);

            return (
              <Fragment key={section.id}>
                {newDay && (
                  <tr className={styles.dayRow}>
                    <td colSpan={colCount}>{dayLabel(section.dayId)}</td>
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
                  const visible = group.items.filter(matches);
                  if (visible.length === 0) return null;
                  const isCollapsed = collapsed.has(group.key);
                  const merged = group.items[0]?.mergedGroupLabel != null;
                  const blockSeconds = group.items.reduce(
                    (sum, it) => sum + (it.durationSeconds ?? 0),
                    0,
                  );
                  return (
                    // A manual row can split one nomination group into two
                    // blocks with the same group.key — index keeps them apart.
                    <Fragment key={`${group.key}-${blockIndex}`}>
                      <tr className={styles.blockRow}>
                        <td className={styles.blockF}>
                          {group.label.slice(0, 1)}
                        </td>
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
                              {item.exit?.number ?? '—'}
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
                                      {other.length > 0 && item.exit && (
                                        <KebabMenu
                                          items={other.map((t) => ({
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
