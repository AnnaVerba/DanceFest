import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import { getMyEntries, uploadEntryTrack } from '../lib/entries';
import type { MyEntry } from '../lib/entries';
import { formatParticipants } from '../lib/entryParticipants';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import {
  formatEntryAmount,
  sumAmountsByParticipant,
  sumEntryAmounts,
} from '../lib/entryAmount';
import { queryKeys } from '../lib/queryKeys';
import { AUDIO_ACCEPT } from '../lib/uploads.constants';
import {
  ENTRY_COLUMN_COUNT_BEFORE_AMOUNT,
  ENTRY_COLUMN_LABEL,
  ENTRY_GRAND_TOTAL_LABEL,
  ENTRY_PARTICIPANT_TOTALS_LABEL,
  ENTRY_TOTAL_LABEL,
} from './ParticipantCabinetPage.constants';
import styles from './ParticipantCabinetPage.module.css';

interface CompetitionGroup {
  competitionId: string;
  competitionName: string;
  entries: MyEntry[];
}

function groupByCompetition(entries: MyEntry[]): CompetitionGroup[] {
  const byId = new Map<string, CompetitionGroup>();
  for (const entry of entries) {
    const key = entry.competitionId;
    const existing = byId.get(key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      byId.set(key, {
        competitionId: key,
        competitionName: entry.competitionName ?? 'Конкурс',
        entries: [entry],
      });
    }
  }
  return [...byId.values()];
}

export default function ParticipantCabinetPage() {
  const session = getSession();
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const entriesQuery = useQuery({
    queryKey: queryKeys.myEntries(),
    queryFn: getMyEntries,
    enabled: !!getToken() && !!session,
  });
  const myEntries = entriesQuery.data ?? null;
  const loading = entriesQuery.isLoading;
  const error = entriesQuery.isError
    ? 'Не вдалося завантажити заявки.'
    : uploadError;

  const groups = useMemo(
    () => groupByCompetition(myEntries ?? []),
    [myEntries],
  );

  const onMusicPick = async (
    entryId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadError(null);
    try {
      const uploaded = await uploadEntryTrack(entryId, file);
      const entry = myEntries?.find((e) => e.id === entryId);
      queryClient.setQueryData<MyEntry[]>(queryKeys.myEntries(), (prev) =>
        prev?.map((e) =>
          e.id === entryId
            ? { ...e, musicName: uploaded.fileName, musicUrl: uploaded.musicUrl }
            : e,
        ),
      );
      // The track's duration can change the performance's timing — the
      // schedule for this competition is no longer trustworthy as cached.
      if (entry) {
        await queryClient.invalidateQueries({
          queryKey: ['timing', entry.competitionId],
        });
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Не вдалося зберегти музику.',
      );
    }
  };

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }

  const isCoach = meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.COACH);
  const displayName = `${session.profile.firstName} ${session.profile.lastName}`;

  return (
    <CabinetLayout wide>
      <div className={styles.wrap}>
        <h1 className={styles.title}>
          {isCoach ? 'Заявки моїх учасників' : 'Мої заявки'}
        </h1>
        <p className={styles.subtitle}>{displayName}</p>

        <section className={styles.tableCard}>
          <div className={styles.tableHead}>Подані заявки</div>
          {loading && <p className={styles.note}>Завантаження...</p>}
          {error && <p className={styles.note}>{error}</p>}
          {!loading && !error && groups.length === 0 && (
            <p className={styles.empty}>Ви ще не подавали заявок.</p>
          )}
          {groups.map((group) => (
            <div key={group.competitionId} className={styles.entryGroup}>
              <div className={styles.groupName}>{group.competitionName}</div>
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
                    {group.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label={ENTRY_COLUMN_LABEL.PARTICIPANT} className={styles.fullRowCell}>
                          {formatParticipants(entry.participants)}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.PARTICIPANT_NUMBERS}>
                          {formatParticipantNumbers(entry.participantNumbers)}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.NOMINATION}>
                          {entry.nomination}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.LEAGUE} className={styles.noWrap}>{entry.league ?? '—'}</td>
                        <td data-label={ENTRY_COLUMN_LABEL.LINEUP} className={styles.noWrap}>{entry.lineup ?? '—'}</td>
                        <td data-label={ENTRY_COLUMN_LABEL.AGE_CATEGORY} className={styles.noWrap}>
                          {entry.ageCategory ?? '—'}
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
                                <label className={styles.musicUploadLabel}>
                                  <input
                                    type="file"
                                    accept={AUDIO_ACCEPT}
                                    hidden
                                    onChange={(e) => onMusicPick(entry.id, e)}
                                  />
                                  <span className={styles.musicEdit}>
                                    {entry.musicName ? 'змінити' : 'додати'}
                                  </span>
                                </label>
                              </>
                            )}
                          </div>
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.AMOUNT}>
                          {formatEntryAmount(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td colSpan={ENTRY_COLUMN_COUNT_BEFORE_AMOUNT}>
                        {ENTRY_TOTAL_LABEL}
                      </td>
                      <td data-label={ENTRY_COLUMN_LABEL.AMOUNT}>
                        {formatEntryAmount(
                          sumEntryAmounts(group.entries.map((e) => e.amount)),
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
                {sumAmountsByParticipant(group.entries).map((row) => (
                  <div key={row.key} className={styles.participantTotal}>
                    <span>{row.participant}</span>
                    <span>{formatEntryAmount(row.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groups.length > 0 && (
            <div className={styles.grandTotal}>
              <span>{ENTRY_GRAND_TOTAL_LABEL}</span>
              <span>
                {formatEntryAmount(
                  sumEntryAmounts((myEntries ?? []).map((e) => e.amount)),
                )}
              </span>
            </div>
          )}
        </section>
      </div>
    </CabinetLayout>
  );
}
