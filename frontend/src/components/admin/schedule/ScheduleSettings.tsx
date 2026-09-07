import { useEffect, useMemo, useState } from 'react';
import { getRules, patchRules } from '../../../lib/competitionRules';
import type { CompetitionRules } from '../../../lib/competitionRules';
import { getNominations } from '../../../lib/nominations';
import { getSections } from '../../../lib/schedule';
import { parseDuration } from '../../../lib/duration';
import styles from './program.module.css';

interface ScheduleSettingsProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
  onSaved: (message: string) => void;
}

const RECALC_HINT =
  'Зміна паузи чи лімітів не перерахує вже сформовані відділення — відкрийте вкладку «Програма», режим «Редагувати» → «Перерахувати розклад».';

function readSeconds(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return parseDuration(trimmed);
}

export default function ScheduleSettings({
  competitionId,
  canManage,
  onError,
  onSaved,
}: ScheduleSettingsProps) {
  const [rules, setRules] = useState<CompetitionRules | null>(null);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [hasSections, setHasSections] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pause, setPause] = useState('');
  const [limits, setLimits] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getRules(competitionId),
      getNominations(competitionId),
      getSections(competitionId, { pageSize: 1 }).then(
        (s) => s.totalSections > 0,
      ),
    ])
      .then(([r, nominations, sectionsExist]) => {
        if (cancelled) return;
        setRules(r);
        setHasSections(sectionsExist);
        setLeagues(
          [...new Set(nominations.flatMap((n) => n.leagues))]
            .filter(Boolean)
            .sort(),
        );
        setPause(String(r.pauseSeconds));
        setLimits(
          Object.fromEntries(
            Object.entries(r.leagueLimits).map(([k, v]) => [k, String(v)]),
          ),
        );
      })
      .catch(() => {
        if (!cancelled)
          onError('Не вдалося завантажити налаштування таймінгів.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const leagueRows = useMemo(() => {
    const set = new Set<string>([...Object.keys(limits), ...leagues]);
    return [...set].filter(Boolean).sort();
  }, [limits, leagues]);

  if (loading) return <p className={styles.empty}>Завантаження…</p>;
  if (!rules) return <p className={styles.empty}>Налаштування недоступні.</p>;

  const handleSave = async () => {
    const nextPause = readSeconds(pause);
    if (nextPause === null || nextPause < 0) {
      onError('Пауза має бути числом секунд.');
      return;
    }
    const nextLimits: Record<string, number> = {};
    for (const [league, raw] of Object.entries(limits)) {
      const seconds = readSeconds(raw);
      if (seconds !== null && seconds > 0) nextLimits[league] = seconds;
    }
    setSaving(true);
    try {
      const saved = await patchRules(competitionId, {
        pauseSeconds: nextPause,
        leagueLimits: nextLimits,
      });
      setRules(saved);
      onSaved('Налаштування таймінгів збережено.');
    } catch {
      onError('Не вдалося зберегти налаштування.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.editPanel}>
        <div className={styles.fieldRow}>
          <div>
            <label className={styles.fieldLabel} htmlFor="settingsPause">
              Технічна пауза між виступами, сек
            </label>
            <input
              id="settingsPause"
              className={styles.numInput}
              value={pause}
              onChange={(e) => setPause(e.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        <div>
          <label className={styles.fieldLabel}>
            Тривалість виступу за положенням — по лігах (<code>1:30</code> або{' '}
            <code>90</code>)
          </label>
          {leagueRows.length === 0 ? (
            <p className={styles.muted}>
              Ліг ще немає — зʼявляться після формування номінацій.
            </p>
          ) : (
            <div className={styles.chips}>
              {leagueRows.map((league) => (
                <div key={league} className={styles.chip}>
                  <span className={styles.chipName}>{league}</span>
                  <input
                    className={styles.chipInput}
                    value={limits[league] ?? ''}
                    placeholder="—"
                    disabled={!canManage}
                    onChange={(e) =>
                      setLimits((prev) => ({
                        ...prev,
                        [league]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {hasSections && <div className={styles.divider} />}
        {hasSections && <p className={styles.warnLine}>{RECALC_HINT}</p>}

        {canManage && (
          <div className={styles.rowActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Збереження…' : 'Зберегти'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
