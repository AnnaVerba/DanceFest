import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import { getMyEntries, uploadEntryTrack } from '../lib/entries';
import type { MyEntry } from '../lib/entries';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import { ENTRY_COLUMN_LABEL } from './ParticipantCabinetPage.constants';
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
  const [myEntries, setMyEntries] = useState<MyEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyEntries()
      .then((entries) => {
        if (!cancelled) setMyEntries(entries);
      })
      .catch(() => {
        if (!cancelled) setError('Не вдалося завантажити заявки.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setError(null);
    try {
      const uploaded = await uploadEntryTrack(entryId, file);
      setMyEntries((prev) =>
        (prev ?? []).map((e) =>
          e.id === entryId
            ? { ...e, musicName: uploaded.fileName, musicUrl: uploaded.musicUrl }
            : e,
        ),
      );
    } catch (err) {
      setError(
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
    <CabinetLayout>
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
                        <td data-label={ENTRY_COLUMN_LABEL.NUMBER}>{entry.number}</td>
                        <td data-label={ENTRY_COLUMN_LABEL.PARTICIPANT_NUMBERS}>
                          {formatParticipantNumbers(entry.participantNumbers)}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.NOMINATION}>
                          {entry.nomination}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.LEAGUE}>{entry.league ?? '—'}</td>
                        <td data-label={ENTRY_COLUMN_LABEL.LINEUP}>{entry.lineup ?? '—'}</td>
                        <td data-label={ENTRY_COLUMN_LABEL.AGE_CATEGORY}>
                          {entry.ageCategory ?? '—'}
                        </td>
                        <td data-label={ENTRY_COLUMN_LABEL.MUSIC}>
                          <div className={styles.musicCell}>
                            {entry.improv ? (
                              <span>Імпровізація</span>
                            ) : (
                              <>
                                {entry.musicUrl ? (
                                  <a
                                    href={entry.musicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.musicListen}
                                  >
                                    {entry.musicName}
                                  </a>
                                ) : (
                                  <span>{entry.musicName ?? '—'}</span>
                                )}
                                <label className={styles.musicUploadLabel}>
                                  <input
                                    type="file"
                                    accept="audio/*"
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      </div>
    </CabinetLayout>
  );
}
