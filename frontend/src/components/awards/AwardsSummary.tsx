import { useEffect, useState } from 'react';
import {
  getAwardsReport,
  setAllMedalLeagues,
  setAwardOverride,
  setAwardSystem,
} from '../../lib/awards';
import {
  AWARD_LINE_KIND,
  AWARD_SYSTEM,
  HTTP_FORBIDDEN,
  SPECIAL_LINE_KINDS,
} from '../../lib/awards.constants';
import type { AwardLine, AwardsReport } from '../../lib/awards.types';
import { ApiError } from '../../lib/http';
import AllMedalLeaguesField from '../nominations/AllMedalLeaguesField';
import AwardLineRow from './AwardLineRow';
import {
  AWARD_LINE_LABELS,
  AWARDS_SUBTITLE,
  AWARDS_TITLE,
  CUP_LABEL_PREFIX,
  EMPTY_PROGRAM_LABEL,
  LEAGUE_LIST_SEPARATOR,
  LEAGUES_CUSTOMIZED_PREFIX,
  LEAGUES_FROM_TEMPLATE_NOTE,
  LOAD_ERROR,
  LOADING_LABEL,
  MEDAL_STANDINGS_HINT,
  MEDAL_STANDINGS_LABEL,
  PERFORMANCES_LABEL,
  RESET_LEAGUES_LABEL,
  SAVE_ERROR,
  SPECIALS_TITLE,
  TEMPLATE_HAS_NO_LEAGUES,
} from './AwardsSummary.constants';
import styles from './AwardsSummary.module.css';

interface AwardsSummaryProps {
  competitionId: string;
}

function labelOf(line: AwardLine): string {
  return line.kind === AWARD_LINE_KIND.CUPS
    ? `${CUP_LABEL_PREFIX} «${line.subject}»`
    : AWARD_LINE_LABELS[line.kind];
}

function rowKeyOf(line: AwardLine): string {
  return `${line.key}|${line.override}|${line.calculated}`;
}

function leagueListOf(leagues: string[]): string {
  return leagues.length > 0
    ? leagues.map((league) => `«${league}»`).join(LEAGUE_LIST_SEPARATOR)
    : TEMPLATE_HAS_NO_LEAGUES;
}

// Staff-only: the server decides. An organizer who is not on this
// competition's team gets 403, and the block quietly disappears.
export default function AwardsSummary({ competitionId }: AwardsSummaryProps) {
  const [report, setReport] = useState<AwardsReport | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAwardsReport(competitionId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === HTTP_FORBIDDEN) {
          setForbidden(true);
        } else {
          setError(LOAD_ERROR);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const save = (request: Promise<AwardsReport>) => {
    setSaving(true);
    setError(null);
    request
      .then(setReport)
      .catch(() => setError(SAVE_ERROR))
      .finally(() => setSaving(false));
  };

  const toggleMedalStandings = (checked: boolean) =>
    save(
      setAwardSystem(
        competitionId,
        checked ? AWARD_SYSTEM.MEDAL_STANDINGS : AWARD_SYSTEM.STANDARD,
      ),
    );

  // null goes back to the category template's leagues.
  const saveAllMedalLeagues = (leagues: string[] | null) =>
    save(setAllMedalLeagues(competitionId, leagues));

  const saveOverride = (key: string, value: number | null) =>
    save(setAwardOverride(competitionId, key, value));

  if (forbidden) return null;

  const generalLines =
    report?.lines.filter((l) => !SPECIAL_LINE_KINDS.includes(l.kind)) ?? [];
  const specialLines =
    report?.lines.filter((l) => SPECIAL_LINE_KINDS.includes(l.kind)) ?? [];
  const specialNames = [
    ...new Set(specialLines.map((l) => l.subject ?? '')),
  ];

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{AWARDS_TITLE}</h2>
      <p className={styles.subtitle}>{AWARDS_SUBTITLE}</p>
      {error && <p className={styles.error}>{error}</p>}
      {!report && !error && <p className={styles.subtitle}>{LOADING_LABEL}</p>}

      {report && (
        <>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={report.awardSystem === AWARD_SYSTEM.MEDAL_STANDINGS}
              disabled={saving}
              onChange={(e) => toggleMedalStandings(e.target.checked)}
            />
            <span className={styles.toggleText}>
              {MEDAL_STANDINGS_LABEL}
              <span className={styles.hint}>{MEDAL_STANDINGS_HINT}</span>
            </span>
          </label>

          <div className={styles.leagues}>
            <AllMedalLeaguesField
              leagueNames={report.leagues}
              selected={report.allMedalLeagues}
              disabled={saving}
              onChange={saveAllMedalLeagues}
            />
            <p className={`${styles.hint} ${styles.leaguesNote}`}>
              {report.allMedalLeaguesCustomized ? (
                <>
                  {LEAGUES_CUSTOMIZED_PREFIX}{' '}
                  {leagueListOf(report.templateAllMedalLeagues)}.{' '}
                  <button
                    type="button"
                    className={styles.linkButton}
                    disabled={saving}
                    onClick={() => saveAllMedalLeagues(null)}
                  >
                    {RESET_LEAGUES_LABEL}
                  </button>
                </>
              ) : (
                LEAGUES_FROM_TEMPLATE_NOTE
              )}
            </p>
          </div>

          {report.performancesInProgram === 0 ? (
            <p className={styles.subtitle}>{EMPTY_PROGRAM_LABEL}</p>
          ) : (
            <>
              <p className={styles.subtitle}>
                {PERFORMANCES_LABEL}: {report.performancesInProgram}
              </p>
              <div className={styles.lines}>
                {generalLines.map((line) => (
                  <AwardLineRow
                    key={rowKeyOf(line)}
                    line={line}
                    label={labelOf(line)}
                    disabled={saving}
                    onSave={saveOverride}
                  />
                ))}
              </div>

              {specialNames.length > 0 && (
                <>
                  <h3 className={styles.subTitle}>{SPECIALS_TITLE}</h3>
                  {specialNames.map((name) => (
                    <div key={name} className={styles.lines}>
                      <strong>{name}</strong>
                      {specialLines
                        .filter((line) => line.subject === name)
                        .map((line) => (
                          <AwardLineRow
                            key={rowKeyOf(line)}
                            line={line}
                            label={labelOf(line)}
                            disabled={saving}
                            onSave={saveOverride}
                          />
                        ))}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
