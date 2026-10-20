import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import NoticeDialog from '../components/admin/NoticeDialog';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import { getMyEntries, uploadEntryTrack } from '../lib/entries';
import { formatEntryPerformers } from '../lib/entryParticipants';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import {
  formatEntryAmount,
  sumAmountsByParticipant,
  sumEntryAmounts,
} from '../lib/entryAmount';
import { queryKeys } from '../lib/queryKeys';
import {
  formatContestDateRange,
  formatMonthNumber,
} from '../lib/homeContests';
import { OWN_ENTRIES_BLOCK_KEY } from '../lib/entryTrainerBlocks.constants';
import { groupMyEntriesPage } from '../lib/myEntriesGroups';
import type {
  MyEntriesBlockView,
  MyEntriesGroupView,
  MyEntriesPageQuery,
} from '../lib/myEntriesPage.types';
import type {
  MyEntriesFilter,
  MyEntriesFilterController,
  MyEntriesFilterOption,
} from '../lib/myEntriesFilter.types';
import {
  DEFAULT_MY_ENTRIES_FILTER,
  MY_ENTRIES_SEARCH_MIN_CHARS,
} from '../lib/myEntriesFilter.constants';
import MyEntriesFilterBar from '../components/MyEntriesFilterBar';
import Pager from '../components/admin/Pager';
import { FIRST_PAGE } from '../components/admin/Pager.constants';
import { AUDIO_ACCEPT } from '../lib/uploads.constants';
import {
  COACH_ENTRIES_TITLE,
  COMPETITION_FALLBACK_NAME,
  ENTRIES_LOAD_FAILED_MESSAGE,
  ENTRY_COLUMN_COUNT_BEFORE_TOTALS,
  ENTRY_COLUMN_LABEL,
  ENTRY_PARTICIPANT_TOTALS_LABEL,
  ENTRY_TOTAL_LABEL,
  ENTRIES_NOT_FOUND_LABEL,
  HEAD_ENTRIES_TITLE,
  HEAD_OWN_BLOCK_LABEL,
  MY_ENTRIES_TITLE,
  MUSIC_UPLOAD_FAILED_MESSAGE,
  MUSIC_UPLOAD_FAILED_TITLE,
  MY_ENTRIES_PAGE_SIZE,
  MY_ENTRIES_PAGER_LABEL,
  MY_ENTRIES_SEARCH_DEBOUNCE_MS,
  TRAINER_BLOCK_LABEL_PREFIX,
  UNNAMED_TRAINER_LABEL,
} from './ParticipantCabinetPage.constants';
import styles from './ParticipantCabinetPage.module.css';

// «17–18 квітня 2027»; null when the competition has no dates.
function groupDateLabel(group: MyEntriesGroupView): string | null {
  return group.competitionDateFrom
    ? formatContestDateRange(
        group.competitionDateFrom,
        group.competitionDateTo ?? group.competitionDateFrom,
      )
    : null;
}

export default function ParticipantCabinetPage() {
  const session = getSession();
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [filter, setFilter] = useState<MyEntriesFilter>(
    DEFAULT_MY_ENTRIES_FILTER,
  );
  const [page, setPage] = useState(FIRST_PAGE);
  // A new filter starts over from the first page.
  const filterController: MyEntriesFilterController = {
    change: (next) => {
      setFilter(next);
      setPage(FIRST_PAGE);
    },
  };
  // The search box asks the server only once typing pauses, and only from
  // MY_ENTRIES_SEARCH_MIN_CHARS characters on.
  const [debouncedSearch, setDebouncedSearch] = useState(filter.query);
  useEffect(() => {
    const query = filter.query.trim();
    const id = setTimeout(
      () =>
        setDebouncedSearch(
          query.length >= MY_ENTRIES_SEARCH_MIN_CHARS ? query : '',
        ),
      MY_ENTRIES_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [filter.query]);

  // Filtering, sorting and paging all happen on the server.
  const pageQuery: MyEntriesPageQuery = {
    filter: { ...filter, query: debouncedSearch },
    page,
    pageSize: MY_ENTRIES_PAGE_SIZE,
  };
  const entriesQuery = useQuery({
    queryKey: queryKeys.myEntries(pageQuery),
    queryFn: () => getMyEntries(pageQuery),
    placeholderData: keepPreviousData,
    enabled: !!getToken() && !!session,
  });
  const entriesPage = entriesQuery.data ?? null;
  const loading = entriesQuery.isLoading;
  const error = entriesQuery.isError ? ENTRIES_LOAD_FAILED_MESSAGE : null;

  // The options span every entry, so «no options» means «no entries yet».
  const hasEntries = (entriesPage?.competitions.length ?? 0) > 0;
  const groups = entriesPage ? groupMyEntriesPage(entriesPage) : [];
  const yearOptions: MyEntriesFilterOption[] = (
    entriesPage?.years ?? []
  ).map((year) => ({ value: year, label: year }));
  const monthOptions: MyEntriesFilterOption[] = (
    entriesPage?.months ?? []
  ).map((month) => ({ value: month, label: formatMonthNumber(month) }));

  const onMusicPick = async (
    entryId: string,
    competitionId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadError(null);
    try {
      await uploadEntryTrack(entryId, file);
      await queryClient.invalidateQueries({ queryKey: queryKeys.myEntries() });
      // The track's duration can change the performance's timing — the
      // schedule for this competition is no longer trustworthy as cached.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timingScope(competitionId),
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : MUSIC_UPLOAD_FAILED_MESSAGE,
      );
    }
  };

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }

  const isCoach = meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.TRAINER);
  // Only a studio head's entries split by trainer.
  const isHead = session.profile.accessLevel === ACCESS_LEVEL.COACH;
  const displayName = `${session.profile.firstName} ${session.profile.lastName}`;
  const title = isHead
    ? HEAD_ENTRIES_TITLE
    : isCoach
      ? COACH_ENTRIES_TITLE
      : MY_ENTRIES_TITLE;
  const blockLabel = (block: MyEntriesBlockView) =>
    block.key === OWN_ENTRIES_BLOCK_KEY
      ? HEAD_OWN_BLOCK_LABEL
      : `${TRAINER_BLOCK_LABEL_PREFIX} ${block.trainerName ?? UNNAMED_TRAINER_LABEL}`;

  return (
    <CabinetLayout wide>
      <div className={styles.wrap}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{displayName}</p>

        <section className={styles.tableCard}>
          <div className={styles.tableHead}>Подані заявки</div>
          {loading && <p className={styles.note}>Завантаження...</p>}
          {error && <p className={styles.note}>{error}</p>}
          {hasEntries && (
            <MyEntriesFilterBar
              filter={filter}
              years={yearOptions}
              months={monthOptions}
              controller={filterController}
            />
          )}
          {!loading && !error && !hasEntries && (
            <p className={styles.empty}>Ви ще не подавали заявок.</p>
          )}
          {hasEntries && groups.length === 0 && (
            <p className={styles.empty}>{ENTRIES_NOT_FOUND_LABEL}</p>
          )}
          {groups.map((group) => (
            <div key={group.competitionId} className={styles.entryGroup}>
              <div className={styles.groupName}>
                {group.competitionName ?? COMPETITION_FALLBACK_NAME}
                {groupDateLabel(group) && (
                  <div className={styles.groupDate}>{groupDateLabel(group)}</div>
                )}
              </div>
              {group.blocks.map((block) => (
              <div key={block.key}>
              {isHead && (
                <div className={styles.blockName}>{blockLabel(block)}</div>
              )}
              <div className={styles.tableScroll}>
                <table className={styles.entryTable}>
                  <thead>
                    <tr>
                      {Object.values(ENTRY_COLUMN_LABEL).map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label={ENTRY_COLUMN_LABEL.PARTICIPANT} className={styles.fullRowCell}>
                          {formatEntryPerformers(entry, isCoach)}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.PARTICIPANT_NUMBERS}>
                          {formatParticipantNumbers(entry.participantNumbers)}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.NOMINATION}>
                          {entry.nomination}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.MUSIC} className={styles.fullRowCell}>
                          <div className={styles.musicCell}>
                            {entry.trackNotNeeded ? (
                              <span>Імпровізація</span>
                            ) : (
                              <>
                                {entry.musicUrl ? (
                                  <a
                                    href={entry.musicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.musicName}
                                  >
                                    {entry.musicName}
                                  </a>
                                ) : (
                                  <span className={styles.musicName}>
                                    {entry.musicName ?? '—'}
                                  </span>
                                )}
                                {entry.canManageTrack && (
                                  <label className={styles.musicUploadLabel}>
                                    <input
                                      type="file"
                                      accept={AUDIO_ACCEPT}
                                      hidden
                                      onChange={(e) =>
                                        onMusicPick(entry.id, entry.competitionId, e)
                                      }
                                    />
                                    <span className={styles.musicEdit}>
                                      {entry.musicName ? 'змінити' : 'додати'}
                                    </span>
                                  </label>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.PRICE}>
                          {formatEntryAmount(entry.baseAmount)}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.MUSIC_FEE}>
                          {formatEntryAmount(entry.musicFee)}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.AMOUNT}>
                          {formatEntryAmount(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td colSpan={ENTRY_COLUMN_COUNT_BEFORE_TOTALS}>
                        {ENTRY_TOTAL_LABEL}
                      </td>
                      <td data-label={ENTRY_COLUMN_LABEL.PRICE}>
                        {formatEntryAmount(
                          sumEntryAmounts(
                            (block.summary?.entries ?? block.rows).map(
                              (e) => e.baseAmount,
                            ),
                          ),
                        )}
                      </td>
                      <td data-label={ENTRY_COLUMN_LABEL.MUSIC_FEE}>
                        {formatEntryAmount(
                          sumEntryAmounts(
                            (block.summary?.entries ?? block.rows).map(
                              (e) => e.musicFee,
                            ),
                          ),
                        )}
                      </td>
                      <td data-label={ENTRY_COLUMN_LABEL.AMOUNT}>
                        {formatEntryAmount(
                          sumEntryAmounts(
                            (block.summary?.entries ?? block.rows).map(
                              (e) => e.amount,
                            ),
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className={styles.participantTotals}>
                <div className={styles.participantTotalsTitle}>
                  {ENTRY_PARTICIPANT_TOTALS_LABEL}
                </div>
                {sumAmountsByParticipant(
                  block.summary?.entries ?? block.rows,
                ).map((row) => (
                  <div key={row.key} className={styles.participantTotal}>
                    <span>{row.participant}</span>
                    <span>{formatEntryAmount(row.amount)}</span>
                  </div>
                ))}
              </div>
              </div>
              ))}
            </div>
          ))}
          {entriesPage && entriesPage.total > 0 && (
            <div className={styles.pagerWrap}>
              <Pager
                navigator={{
                  page,
                  pageSize: MY_ENTRIES_PAGE_SIZE,
                  total: entriesPage.total,
                  goTo: setPage,
                }}
                ariaLabel={MY_ENTRIES_PAGER_LABEL}
              />
            </div>
          )}
        </section>
      </div>
      <NoticeDialog
        open={uploadError !== null}
        title={MUSIC_UPLOAD_FAILED_TITLE}
        message={uploadError ?? ''}
        onClose={() => setUploadError(null)}
      />
    </CabinetLayout>
  );
}
