import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNominationsForEntry } from "../../lib/nominations";
import type { Nomination } from "../../lib/nominations";
import { useNominationAxes } from "../../lib/useNominationAxes";
import {
  AGE_CATEGORY_TYPE,
  LEAGUE_CATEGORY_TYPE,
  STYLE_CATEGORY_TYPE,
} from "../../lib/categories";
import { queryKeys } from "../../lib/queryKeys";
import { formatEntryAmount } from "../../lib/entryAmount";
import {
  LEAGUE_LABEL,
  LEAGUE_PLACEHOLDER,
} from "../../lib/applyLeague.constants";
import {
  AGE_CATEGORY_LABEL,
  AGE_CATEGORY_PLACEHOLDER,
} from "../../lib/applyAge.constants";
import { NOMINATIONS_LOAD_FAILED_MESSAGE } from "../../lib/applyNominations.constants";
import {
  CURRENT_NOMINATION_LABEL,
  EMPTY_CHOICE,
  IMPROVISATION_ROW_SUFFIX,
  NOMINATION_FOR_ENTRY_QUERY_SCOPE,
  NOMINATION_ROWS_LABEL,
  NOMINATION_ROWS_LOADING_LABEL,
  NOMINATION_ROWS_PICK_HINT,
  NO_NOMINATION_ROWS_MESSAGE,
  STYLES_HINT,
  STYLES_LABEL,
} from "./EntryCategoryFields.constants";
import type { EntryCategoryChoice } from "./entryCategoryChoice.types";
import styles from "./EditForm.module.css";

interface EntryCategoryFieldsProps {
  competitionId: string;
  // How many dancers the number puts on stage — the nominations that fit it.
  headcount: number;
  choice: EntryCategoryChoice;
  nominationId: string;
  // The nomination the entry holds now, shown above the list.
  nominationName: string;
  onChoiceChange: (changes: Partial<EntryCategoryChoice>) => void;
  onPickNomination: (nomination: Nomination) => void;
  // Shown between the league and age and the styles — where the dancers go.
  children?: ReactNode;
}

// League, age and style narrow the competition's nominations to the ones the
// number can enter — the same pick the apply form makes — and the staff
// choose the entry's nomination among them.
export default function EntryCategoryFields({
  competitionId,
  headcount,
  choice,
  nominationId,
  nominationName,
  onChoiceChange,
  onPickNomination,
  children,
}: EntryCategoryFieldsProps) {
  const { data: axes } = useNominationAxes(competitionId);

  const leagues = axes?.[LEAGUE_CATEGORY_TYPE] ?? [];
  const ageCategories = axes?.[AGE_CATEGORY_TYPE] ?? [];
  const styleValues = axes?.[STYLE_CATEGORY_TYPE] ?? [];
  const hasStyles = styleValues.length > 0;

  const leagueId = leagues.find((v) => v.name === choice.league)?.id;
  const ageCategoryId = ageCategories.find(
    (v) => v.name === choice.ageCategory,
  )?.id;
  const styleId = styleValues.find((v) => v.name === choice.style)?.id;

  const canListRows =
    leagueId !== undefined &&
    (!hasStyles || styleId !== undefined) &&
    headcount > 0;
  const rows = useQuery({
    queryKey: [
      ...queryKeys.nominationAxes(competitionId),
      NOMINATION_FOR_ENTRY_QUERY_SCOPE,
      leagueId,
      ageCategoryId,
      styleId,
      headcount,
    ],
    queryFn: () =>
      getNominationsForEntry(competitionId, {
        league: leagueId,
        ageCategory: ageCategoryId,
        styles: styleId ? [styleId] : [],
        participants: headcount,
        ages: [],
      }),
    enabled: canListRows,
  });

  return (
    <>
      <div className={styles.two}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="entry-league">
            {LEAGUE_LABEL}
          </label>
          <select
            id="entry-league"
            className={styles.input}
            value={choice.league}
            onChange={(e) => onChoiceChange({ league: e.target.value })}
          >
            <option value={EMPTY_CHOICE}>{LEAGUE_PLACEHOLDER}</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.name}>
                {league.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="entry-age">
            {AGE_CATEGORY_LABEL}
          </label>
          <select
            id="entry-age"
            className={styles.input}
            value={choice.ageCategory}
            onChange={(e) => onChoiceChange({ ageCategory: e.target.value })}
          >
            <option value={EMPTY_CHOICE}>{AGE_CATEGORY_PLACEHOLDER}</option>
            {ageCategories.map((age) => (
              <option key={age.id} value={age.name}>
                {age.name} ({age.rangeFrom}–{age.rangeTo})
              </option>
            ))}
          </select>
        </div>
      </div>

      {children}

      {hasStyles && (
        <div className={styles.field}>
          <span className={styles.label}>{STYLES_LABEL}</span>
          <div className={styles.chips}>
            {styleValues.map((style) => (
              <button
                key={style.id}
                type="button"
                className={`${styles.option} ${
                  choice.style === style.name ? styles.optionOn : ""
                }`}
                onClick={() => onChoiceChange({ style: style.name })}
              >
                {style.name}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{STYLES_HINT}</p>
        </div>
      )}

      <div className={styles.field}>
        <span className={styles.label}>{NOMINATION_ROWS_LABEL}</span>
        {nominationName && (
          <p className={styles.hint}>
            {CURRENT_NOMINATION_LABEL}: {nominationName}
          </p>
        )}
        {canListRows && rows.isPending && (
          <p className={styles.hint}>{NOMINATION_ROWS_LOADING_LABEL}</p>
        )}
        {rows.isError && (
          <p className={styles.error}>{NOMINATIONS_LOAD_FAILED_MESSAGE}</p>
        )}
        {canListRows && rows.data && rows.data.length === 0 && (
          <p className={styles.hint}>{NO_NOMINATION_ROWS_MESSAGE}</p>
        )}
        {rows.data && rows.data.length > 0 && (
          <div className={styles.nomList}>
            {rows.data.map((nomination) => {
              const on = nomination.id === nominationId;
              return (
                <button
                  key={nomination.id}
                  type="button"
                  className={`${styles.nomRow} ${on ? styles.nomRowOn : ""}`}
                  onClick={() => onPickNomination(nomination)}
                >
                  <span className={styles.nomLabel}>
                    {nomination.isImprovisation
                      ? `${nomination.name}${IMPROVISATION_ROW_SUFFIX}`
                      : nomination.name}
                  </span>
                  <span className={styles.nomPrice}>
                    {formatEntryAmount(nomination.price)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {!nominationId && canListRows && (
          <p className={styles.hint}>{NOMINATION_ROWS_PICK_HINT}</p>
        )}
      </div>
    </>
  );
}
