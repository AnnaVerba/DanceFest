import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRules, patchRules } from '../../../lib/competitionRules';
import type { RulesPatch } from '../../../lib/competitionRules';
import { getNominations } from '../../../lib/nominations';
import { LINEUP_LIMIT_LABELS } from '../../../lib/lineupLimits.constants';
import { refreshProgram } from '../../../lib/programCache';
import { getSections, recalculateSchedule } from '../../../lib/schedule';
import { parseDuration } from '../../../lib/duration';
import { queryKeys } from '../../../lib/queryKeys';
import styles from './program.module.css';

interface ScheduleSettingsProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
  onSaved: (message: string) => void;
}

const RECALC_HINT =
  'Після збереження розклад уже сформованих відділень перераховується автоматично за новими паузами й лімітами.';

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
  const queryClient = useQueryClient();
  const [pause, setPause] = useState('');
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [lineupLimits, setLineupLimits] = useState<Record<string, string>>({});
  const [improvSeconds, setImprovSeconds] = useState('');

  const rulesQuery = useQuery({
    queryKey: queryKeys.rules(competitionId),
    queryFn: () => getRules(competitionId),
  });
  const nominationsQuery = useQuery({
    queryKey: queryKeys.nominations(competitionId),
    queryFn: () => getNominations(competitionId),
  });
  const sectionsExistQuery = useQuery({
    queryKey: queryKeys.sections(competitionId, { pageSize: 1 }),
    queryFn: () => getSections(competitionId, { pageSize: 1 }),
  });

  const rules = rulesQuery.data ?? null;
  const hasSections = (sectionsExistQuery.data?.totalSections ?? 0) > 0;
  const leagues = useMemo(() => {
    const list = nominationsQuery.data ?? [];
    return [...new Set(list.flatMap((n) => n.leagues))].filter(Boolean).sort();
  }, [nominationsQuery.data]);
  const loading =
    rulesQuery.isLoading || nominationsQuery.isLoading || sectionsExistQuery.isLoading;

  useEffect(() => {
    if (rulesQuery.isError || nominationsQuery.isError || sectionsExistQuery.isError) {
      onError('Не вдалося завантажити налаштування таймінгів.');
    }
  }, [
    rulesQuery.isError,
    nominationsQuery.isError,
    sectionsExistQuery.isError,
    onError,
  ]);

  // Seed the editable draft once per loaded rules row — a save round-trips
  // the same id, so it doesn't clobber the fields the user just set.
  const [seededRulesId, setSeededRulesId] = useState<string | null>(null);
  if (rules && rules.id !== seededRulesId) {
    setSeededRulesId(rules.id);
    setPause(String(rules.pauseSeconds));
    setLimits(
      Object.fromEntries(
        Object.entries(rules.leagueLimits).map(([k, v]) => [k, String(v)]),
      ),
    );
    setLineupLimits(
      Object.fromEntries(
        Object.entries(rules.lineupLimits).map(([k, v]) => [k, String(v)]),
      ),
    );
    setImprovSeconds(String(rules.improvIndividualSeconds));
  }

  const patchRulesMutation = useMutation({
    mutationFn: (patch: RulesPatch) => patchRules(competitionId, patch),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.rules(competitionId), saved);
      // League duration changes push a new durationLimitSeconds onto that
      // league's nominations (see BUG-10) — refetch so the Номінації tab
      // doesn't keep showing the value it had cached before the save.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nominations(competitionId),
      });
    },
  });

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
    const nextLineupLimits: Record<string, number> = {};
    for (const [lineup, raw] of Object.entries(lineupLimits)) {
      const seconds = readSeconds(raw);
      if (seconds !== null && seconds > 0) nextLineupLimits[lineup] = seconds;
    }
    const nextImprovSeconds = readSeconds(improvSeconds);
    if (nextImprovSeconds === null || nextImprovSeconds <= 0) {
      onError('Імпровізація: вкажіть, скільки секунд припадає на учасника.');
      return;
    }
    try {
      await patchRulesMutation.mutateAsync({
        pauseSeconds: nextPause,
        leagueLimits: nextLimits,
        lineupLimits: nextLineupLimits,
        improvIndividualSeconds: nextImprovSeconds,
      });
      if (hasSections) {
        await recalculateSchedule(competitionId);
        await refreshProgram(queryClient, competitionId);
      }
      onSaved('Налаштування таймінгів збережено.');
    } catch {
      onError('Не вдалося зберегти налаштування.');
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

        <div>
          <label className={styles.fieldLabel}>
            Тривалість групових номерів — за складом, незалежно від ліги (
            <code>2:30</code> або <code>150</code>)
          </label>
          <div className={styles.chips}>
            {LINEUP_LIMIT_LABELS.map((lineup) => (
              <div key={lineup} className={styles.chip}>
                <span className={styles.chipName}>{lineup}</span>
                <input
                  className={styles.chipInput}
                  value={lineupLimits[lineup] ?? ''}
                  placeholder="—"
                  disabled={!canManage}
                  onChange={(e) =>
                    setLineupLimits((prev) => ({
                      ...prev,
                      [lineup]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div>
            <label className={styles.fieldLabel} htmlFor="settingsImprovSeconds">
              Імпровізація — секунд на учасника
            </label>
            <input
              id="settingsImprovSeconds"
              className={styles.numInput}
              value={improvSeconds}
              onChange={(e) => setImprovSeconds(e.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        {hasSections && <div className={styles.divider} />}
        {hasSections && <p className={styles.warnLine}>{RECALC_HINT}</p>}

        {canManage && (
          <div className={styles.rowActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={patchRulesMutation.isPending}
              onClick={handleSave}
            >
              {patchRulesMutation.isPending ? 'Збереження…' : 'Зберегти'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
