import { useEffect, useMemo, useState } from 'react';
import { getSelectableCoaches } from '../../lib/auth';
import type { CoachSummary } from '../../lib/auth';
import { formatParticipantName } from '../../lib/entryParticipants';
import {
  ParticipantApiError,
  createParticipant,
  getApplicableParticipants,
} from '../../lib/participants';
import type { Participant } from '../../lib/participants';
import {
  PARTICIPANT_SEARCH_DEBOUNCE_MS,
  PARTICIPANT_SEARCH_MIN_CHARS,
} from '../../lib/participants.constants';
import {
  NEW_PARTICIPANT_BIRTH_DATE_REQUIRED_MESSAGE,
  NEW_PARTICIPANT_CANCEL_LABEL,
  NEW_PARTICIPANT_COACH_PLACEHOLDER,
  NEW_PARTICIPANT_FAILED_MESSAGE,
  NEW_PARTICIPANT_FIRST_NAME_PLACEHOLDER,
  NEW_PARTICIPANT_LAST_NAME_PLACEHOLDER,
  NEW_PARTICIPANT_LINK_LABEL,
  NEW_PARTICIPANT_NAME_REQUIRED_MESSAGE,
  NEW_PARTICIPANT_PHONE_PLACEHOLDER,
  NEW_PARTICIPANT_PHONE_REQUIRED_MESSAGE,
  NEW_PARTICIPANT_SUBMIT_LABEL,
  NEW_PARTICIPANT_TITLE,
  PARTICIPANT_NOT_FOUND_LABEL,
  PARTICIPANT_SEARCHING_HINT,
  PARTICIPANT_SEARCH_FAILED_MESSAGE,
  PARTICIPANT_SEARCH_PLACEHOLDER,
  PARTICIPANT_SEARCH_TOO_SHORT_HINT,
  PARTICIPANTS_DEFAULT_HINT,
  PARTICIPANTS_LABEL,
} from '../../lib/participantPicker.constants';
import type { SelectableParticipant } from '../../lib/applyParticipants.types';
import styles from '../ApplyPage.module.css';

interface ParticipantPickerProps {
  // The dancers picked so far; the page owns them, the picker only edits.
  selected: SelectableParticipant[];
  // A plain participant applies only for themselves — a locked field.
  selfParticipant: SelectableParticipant | null;
  // Offered first in the roster, so a coach can enter themselves too.
  selfAsOption: SelectableParticipant | null;
  isCoach: boolean;
  // Organizer or admin: may file a new dancer under any coach.
  canPickCoach: boolean;
  // Studio staff see their own roster before typing a letter.
  isStaffSubmitter: boolean;
  invalid: boolean;
  label?: string;
  hint?: string;
  // Why the last pick was refused, shown under the hint.
  notice?: string | null;
  onAdd: (person: SelectableParticipant) => void;
  onRemove: (id: string) => void;
}

function coachOptionLabel(coach: CoachSummary): string {
  const name = formatParticipantName(coach);
  return coach.schoolName ? `${name} — ${coach.schoolName}` : name;
}

// Finds dancers by name and picks them for a number: the roster search with
// its option list, plus the form that creates a dancer who is not there yet.
export default function ParticipantPicker({
  selected,
  selfParticipant,
  selfAsOption,
  isCoach,
  canPickCoach,
  isStaffSubmitter,
  invalid,
  label = PARTICIPANTS_LABEL,
  hint = PARTICIPANTS_DEFAULT_HINT,
  notice = null,
  onAdd,
  onRemove,
}: ParticipantPickerProps) {
  const [participantQuery, setParticipantQuery] = useState('');
  // The picker's options show only while the search field has focus.
  const [participantListOpen, setParticipantListOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [showNewParticipant, setShowNewParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '',
  });
  const [newParticipantError, setNewParticipantError] = useState<string | null>(
    null,
  );
  // The coach a new dancer is filed under. Only an organizer or admin picks
  // one — the server files a coach's own dancers under the coach.
  const [newParticipantCoach, setNewParticipantCoach] =
    useState<CoachSummary | null>(null);
  const [coachQuery, setCoachQuery] = useState('');
  const [coachOptions, setCoachOptions] = useState<CoachSummary[]>([]);

  // Name search over the roster — never loads every participant at once.
  useEffect(() => {
    if (!isCoach) return;
    const q = participantQuery.trim();
    let cancelled = false;
    const handle = setTimeout(() => {
      const browsing = isStaffSubmitter && q.length === 0;
      if (!browsing && q.length < PARTICIPANT_SEARCH_MIN_CHARS) {
        setSearchResults([]);
        setSearching(false);
        setSearchError(null);
        return;
      }
      setSearching(true);
      getApplicableParticipants(q)
        .then((people) => {
          if (!cancelled) {
            setSearchResults(people);
            setSearchError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setSearchError(PARTICIPANT_SEARCH_FAILED_MESSAGE);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, PARTICIPANT_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [participantQuery, isCoach, isStaffSubmitter]);

  // Coach typeahead for the new-participant form. getSelectableCoaches
  // answers with an empty list until the query is long enough.
  useEffect(() => {
    if (!canPickCoach || !showNewParticipant || newParticipantCoach) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      getSelectableCoaches(coachQuery)
        .then((coaches) => {
          if (!cancelled) setCoachOptions(coaches);
        })
        .catch(() => {
          if (!cancelled) setCoachOptions([]);
        });
    }, PARTICIPANT_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [coachQuery, canPickCoach, showNewParticipant, newParticipantCoach]);

  // Rows offered under the search box: the coach themselves (always
  // available, no search needed) plus whatever the current query matched,
  // minus anyone already picked.
  const searchOptions: SelectableParticipant[] = useMemo(() => {
    const pickedIds = new Set(selected.map((p) => p.id));
    const matches = searchResults
      .filter((p) => !pickedIds.has(p.id))
      .map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate,
      }));
    const self =
      selfAsOption && !pickedIds.has(selfAsOption.id) ? [selfAsOption] : [];
    return [...self, ...matches];
  }, [searchResults, selected, selfAsOption]);

  const handleCreateParticipant = async () => {
    setNewParticipantError(null);
    const { firstName, lastName, phone, birthDate } = newParticipant;
    if (!firstName.trim() || !lastName.trim()) {
      setNewParticipantError(NEW_PARTICIPANT_NAME_REQUIRED_MESSAGE);
      return;
    }
    if (!phone.trim()) {
      setNewParticipantError(NEW_PARTICIPANT_PHONE_REQUIRED_MESSAGE);
      return;
    }
    if (!birthDate) {
      setNewParticipantError(NEW_PARTICIPANT_BIRTH_DATE_REQUIRED_MESSAGE);
      return;
    }
    try {
      const created = await createParticipant({
        firstName,
        lastName,
        phone,
        birthDate,
        ...(newParticipantCoach ? { coachId: newParticipantCoach.id } : {}),
      });
      onAdd({
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        birthDate: created.birthDate,
      });
      setNewParticipant({
        firstName: '',
        lastName: '',
        phone: '',
        birthDate: '',
      });
      setNewParticipantCoach(null);
      setCoachQuery('');
      setCoachOptions([]);
      setShowNewParticipant(false);
    } catch (err) {
      setNewParticipantError(
        err instanceof ParticipantApiError
          ? err.message
          : NEW_PARTICIPANT_FAILED_MESSAGE,
      );
    }
  };

  return (
    <>
      <label className={styles.label}>
        {label} <span className={styles.req}>*</span>
      </label>

      {selfParticipant ? (
        <div className={styles.readonlyBox}>
          {formatParticipantName(selfParticipant)}
        </div>
      ) : (
        <>
          {selected.length > 0 && (
            <div className={styles.chips}>
              {selected.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.chip} ${styles.chipOn}`}
                  onClick={() => onRemove(p.id)}
                >
                  {formatParticipantName(p)} ✕
                </button>
              ))}
            </div>
          )}

          <input
            className={`${styles.textInput} ${invalid ? styles.invalid : ''}`}
            type="text"
            placeholder={PARTICIPANT_SEARCH_PLACEHOLDER}
            value={participantQuery}
            onChange={(e) => setParticipantQuery(e.target.value)}
            onFocus={() => setParticipantListOpen(true)}
            onBlur={() => setParticipantListOpen(false)}
          />

          {participantQuery.trim().length > 0 &&
            participantQuery.trim().length < PARTICIPANT_SEARCH_MIN_CHARS && (
              <p className={styles.hint}>{PARTICIPANT_SEARCH_TOO_SHORT_HINT}</p>
            )}
          {searching && <p className={styles.hint}>{PARTICIPANT_SEARCHING_HINT}</p>}
          {searchError && <p className={styles.error}>{searchError}</p>}

          {participantListOpen && searchOptions.length > 0 && (
            // mousedown would blur the input and close the list before
            // the click lands; keeping focus also leaves it open for
            // picking several dancers in a row.
            <div
              className={styles.nomList}
              onMouseDown={(e) => e.preventDefault()}
            >
              {searchOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.nomRow}
                  onClick={() => onAdd(p)}
                >
                  <span className={styles.nomCheck} />
                  <span className={styles.nomLabel}>
                    {formatParticipantName(p)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {participantListOpen &&
            !searching &&
            !searchError &&
            participantQuery.trim().length >= PARTICIPANT_SEARCH_MIN_CHARS &&
            searchOptions.length === 0 && (
              <div className={styles.nomEmpty}>{PARTICIPANT_NOT_FOUND_LABEL}</div>
            )}
          {hint && <p className={styles.hint}>{hint}</p>}
          {notice && <p className={styles.error}>{notice}</p>}
        </>
      )}

      {isCoach && !showNewParticipant && (
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => {
            setShowNewParticipant(true);
            setNewParticipantError(null);
          }}
        >
          {NEW_PARTICIPANT_LINK_LABEL}
        </button>
      )}

      {isCoach && showNewParticipant && (
        <div className={styles.subForm}>
          <div className={styles.subTitle}>{NEW_PARTICIPANT_TITLE}</div>
          <div className={styles.subGrid}>
            <input
              className={styles.subInput}
              placeholder={NEW_PARTICIPANT_FIRST_NAME_PLACEHOLDER}
              value={newParticipant.firstName}
              onChange={(e) =>
                setNewParticipant((p) => ({
                  ...p,
                  firstName: e.target.value,
                }))
              }
            />
            <input
              className={styles.subInput}
              placeholder={NEW_PARTICIPANT_LAST_NAME_PLACEHOLDER}
              value={newParticipant.lastName}
              onChange={(e) =>
                setNewParticipant((p) => ({
                  ...p,
                  lastName: e.target.value,
                }))
              }
            />
          </div>
          <div className={styles.subGrid}>
            <input
              className={styles.subInput}
              placeholder={NEW_PARTICIPANT_PHONE_PLACEHOLDER}
              value={newParticipant.phone}
              onChange={(e) =>
                setNewParticipant((p) => ({
                  ...p,
                  phone: e.target.value,
                }))
              }
            />
            <input
              className={styles.subInput}
              type="date"
              value={newParticipant.birthDate}
              onChange={(e) =>
                setNewParticipant((p) => ({
                  ...p,
                  birthDate: e.target.value,
                }))
              }
            />
          </div>
          {canPickCoach &&
            (newParticipantCoach ? (
              <div className={styles.chips}>
                <button
                  type="button"
                  className={`${styles.chip} ${styles.chipOn}`}
                  onClick={() => {
                    setNewParticipantCoach(null);
                    setCoachQuery('');
                  }}
                >
                  {coachOptionLabel(newParticipantCoach)} ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  className={styles.subInput}
                  placeholder={NEW_PARTICIPANT_COACH_PLACEHOLDER}
                  value={coachQuery}
                  onChange={(e) => setCoachQuery(e.target.value)}
                />
                {coachOptions.length > 0 && (
                  <div className={styles.nomList}>
                    {coachOptions.map((coach) => (
                      <button
                        key={coach.id}
                        type="button"
                        className={styles.nomRow}
                        onClick={() => {
                          setNewParticipantCoach(coach);
                          setCoachOptions([]);
                        }}
                      >
                        <span className={styles.nomLabel}>
                          {coachOptionLabel(coach)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ))}
          {newParticipantError && (
            <p className={styles.error}>{newParticipantError}</p>
          )}
          <div className={styles.subActions}>
            <button
              type="button"
              className={styles.btnPrimarySm}
              onClick={handleCreateParticipant}
            >
              {NEW_PARTICIPANT_SUBMIT_LABEL}
            </button>
            <button
              type="button"
              className={styles.btnGhostSm}
              onClick={() => {
                setShowNewParticipant(false);
                setNewParticipantError(null);
              }}
            >
              {NEW_PARTICIPANT_CANCEL_LABEL}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
