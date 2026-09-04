import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import { getMyEntries, updateEntryMusic } from '../lib/entries';
import type { MyEntry } from '../lib/entries';
import { formatParticipantNumbers } from '../lib/participantNumbers';
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
      const updated = await updateEntryMusic(entryId, file.name);
      setMyEntries((prev) =>
        (prev ?? []).map((e) =>
          e.id === entryId ? { ...e, musicName: updated.musicName } : e,
        ),
      );
    } catch {
      setError('Не вдалося зберегти музику.');
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
                      <th>№</th>
                      <th>№ учасника</th>
                      <th>Номінація</th>
                      <th>Ліга</th>
                      <th>Склад</th>
                      <th>Вік. кат.</th>
                      <th>Музика</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.number}</td>
                        <td>{formatParticipantNumbers(entry.participantNumbers)}</td>
                        <td>{entry.nomination}</td>
                        <td>{entry.league ?? '—'}</td>
                        <td>{entry.lineup ?? '—'}</td>
                        <td>{entry.ageCategory ?? '—'}</td>
                        <td>
                          <label className={styles.musicCell}>
                            <span>
                              {entry.musicName ??
                                (entry.improv ? 'Імпровізація' : '—')}
                            </span>
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
