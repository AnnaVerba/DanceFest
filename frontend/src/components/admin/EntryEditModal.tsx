import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompetition } from '../../lib/competitions';
import Modal from './Modal';
import EntryParticipantsField from './EntryParticipantsField';
import EntryCategoryFields from './EntryCategoryFields';
import EntryLeadersFields from './EntryLeadersFields';
import EntryReadonlyField from './EntryReadonlyField';
import { getEntry, updateEntry, uploadEntryTrack } from '../../lib/entries';
import { resolveCoachId } from '../../lib/auth';
import type { SetMentorCoachBody } from '../../lib/auth';
import { AUDIO_ACCEPT } from '../../lib/uploads.constants';
import { queryKeys } from '../../lib/queryKeys';
import { formatEntryAmount } from '../../lib/entryAmount';
import { AGE_CATEGORY_TYPE, STYLE_CATEGORY_TYPE } from '../../lib/categories';
import { participantAges } from '../../lib/ageEligibility';
import { resolveGroupAgeCategory } from '../../lib/groupAge';
import { NOMINATION_LABEL_SEPARATOR } from '../../lib/nominationNaming';
import { useNominationAxes } from '../../lib/useNominationAxes';
import type { Entry } from '../../lib/entries';
import type {
  EntryDetails,
  EntryParticipant,
  PaymentMethod,
} from '../../lib/entryEdit.types';
import type { EntryCategoryChoice } from './entryCategoryChoice.types';
import { EMPTY_CHOICE, NO_CHOICE } from './EntryCategoryFields.constants';
import {
  AMOUNT_LABEL,
  ENTRY_LOAD_FAILED_MESSAGE,
  ENTRY_SAVE_FAILED_MESSAGE,
  IMPROVISATION_ENTRY_NOTE,
  MUSIC_ADD_LABEL,
  MUSIC_LABEL,
  MUSIC_NONE,
  MUSIC_REPLACE_LABEL,
  MUSIC_UPLOADING_LABEL,
  MUSIC_UPLOAD_FAILED_MESSAGE,
  NOMINATION_REQUIRED_MESSAGE,
  NO_PAYMENT_METHOD,
  PARTICIPANTS_LINEUP_HINT,
  PAYMENT_METHOD_LABELS,
} from './EntryEditModal.constants';
import {
  GROUP_EMPTY_VALUE_LABEL,
  GROUP_HEADCOUNT_LABEL,
  GROUP_HEADCOUNT_REQUIRED_MESSAGE,
  GROUP_LINEUP_HINT,
  GROUP_LINEUP_LABEL,
  GROUP_LINEUP_VALUE,
  GROUP_MAX_PARTICIPANTS,
  GROUP_MIN_HEADCOUNT,
  GROUP_NAME_LABEL,
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_REQUIRED_MESSAGE,
  GROUP_PARTICIPANTS_LABEL,
  GROUP_PARTICIPANTS_REQUIRED_MESSAGE,
  LINEUP_MODE,
} from '../../lib/groupApply.constants';
import { isGroupSize, parseHeadcount } from '../../lib/groupApply';
import { lineupLabel } from '../../lib/lineup';
import {
  INDIVIDUAL_MAX_PARTICIPANTS,
  INDIVIDUAL_MAX_PARTICIPANTS_MESSAGE,
} from '../../lib/applyTabs.constants';
import {
  ROUTINE_TITLE_LABEL,
  ROUTINE_TITLE_MAX_LENGTH,
} from '../../lib/applyRoutineTitle.constants';
import styles from './EditForm.module.css';

interface EntryEditModalProps {
  competitionId: string;
  // Mounted per entry (keyed by id), so its state starts fresh each time.
  entryId: string;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}

// The entry's track as shown in the form; uploaded on pick, not on save.
interface EntryMusic {
  trackNotNeeded: boolean;
  name: string | null;
  url: string | null;
}

interface EntryForm {
  // A group is named by its routineName; a solo, duo or trio by the dancers'
  // names, with the optional routineTitle after them.
  isGroup: boolean;
  routineName: string;
  routineTitle: string;
  // A group's typed headcount; counted from the dancers once they are named.
  headcount: string;
  // The pick that narrows the nominations; the nomination is chosen among them.
  choice: EntryCategoryChoice;
  // Set once the league, age or style is changed: the old nomination no longer
  // follows from the pick, so a new one has to be chosen.
  choiceChanged: boolean;
  nominationId: string;
  // Display only — the form saves the id.
  nominationName: string;
  participants: EntryParticipant[];
  // The studio the entry is filed under; saved only when it is changed.
  studioId: string;
  initialStudioId: string;
  // Display only — the studio and choreographer the entry has now.
  studioName: string;
  choreographer: string;
  city: string;
  improv: boolean;
  paymentMethod: PaymentMethod | typeof NO_PAYMENT_METHOD;
  amount: number | null;
}

function toForm(entry: EntryDetails): EntryForm {
  return {
    isGroup: entry.lineup === GROUP_LINEUP_VALUE,
    routineName: entry.routineName,
    routineTitle: entry.routineTitle ?? '',
    headcount: String(entry.participantsCount ?? entry.participants.length),
    choice: {
      league: entry.league ?? EMPTY_CHOICE,
      ageCategory: entry.ageCategory ?? EMPTY_CHOICE,
      style: EMPTY_CHOICE,
    },
    choiceChanged: false,
    nominationId: entry.nominationId ?? '',
    nominationName: entry.nomination,
    participants: entry.participants,
    studioId: entry.studioId ?? '',
    initialStudioId: entry.studioId ?? '',
    studioName: entry.studioName ?? '',
    choreographer: entry.choreographer ?? '',
    city: entry.city ?? '',
    improv: entry.improv ?? false,
    paymentMethod: entry.paymentMethod ?? NO_PAYMENT_METHOD,
    amount: entry.amount ?? null,
  };
}

export default function EntryEditModal({
  competitionId,
  entryId,
  onClose,
  onSaved,
}: EntryEditModalProps) {
  const queryClient = useQueryClient();
  const { data: competition } = useQuery({
    queryKey: queryKeys.competition(competitionId),
    queryFn: () => getCompetition(competitionId),
  });
  const { data: axes } = useNominationAxes(competitionId);
  const [form, setForm] = useState<EntryForm | null>(null);
  const [trainer, setTrainer] = useState<SetMentorCoachBody | null>(null);
  const [music, setMusic] = useState<EntryMusic | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when a pick was refused for going over the solo/duo/trio limit.
  const [participantLimitHit, setParticipantLimitHit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEntry(competitionId, entryId)
      .then((entry) => {
        if (cancelled) return;
        setForm(toForm(entry));
        setMusic({
          trackNotNeeded: entry.trackNotNeeded ?? false,
          name: entry.musicName ?? null,
          url: entry.musicUrl ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(ENTRY_LOAD_FAILED_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, entryId]);

  // A nomination's name lists its axis values, the style among them — that
  // is how the style the entry was filed in is found for the form.
  const nominationParts = form?.nominationName.split(NOMINATION_LABEL_SEPARATOR);
  const filedStyle =
    (axes?.[STYLE_CATEGORY_TYPE] ?? []).find((value) =>
      nominationParts?.includes(value.name),
    )?.name ?? EMPTY_CHOICE;

  // A group of a count-only competition is never given dancers by name.
  const namesDancers =
    !form?.isGroup || competition?.groupLineupMode === LINEUP_MODE.NAMED;
  // A group that names its dancers does not pick an age category: it follows
  // from their ages, as in the apply form.
  const ageAutomatic = !!form?.isGroup && namesDancers;

  const autoAgeCategory = (people: EntryParticipant[]): string | undefined => {
    if (!competition || !axes) return undefined;
    const birthDates = people.flatMap((p) => (p.birthDate ? [p.birthDate] : []));
    const ranges = (axes[AGE_CATEGORY_TYPE] ?? []).map(
      ({ name, rangeFrom, rangeTo }) => ({ name, rangeFrom, rangeTo }),
    );
    return resolveGroupAgeCategory(
      participantAges(birthDates, competition.dateFrom),
      ranges,
    )?.name;
  };

  const choice: EntryCategoryChoice = {
    ...(form?.choice ?? NO_CHOICE),
    ageCategory:
      (ageAutomatic && form ? autoAgeCategory(form.participants) : undefined) ??
      form?.choice.ageCategory ??
      EMPTY_CHOICE,
    style: form?.choice.style || filedStyle,
  };

  const patch = (changes: Partial<EntryForm>) =>
    setForm((prev) => (prev ? { ...prev, ...changes } : prev));

  // A new line-up can move a group into another age category, and the
  // nomination chosen for the old one then has to be chosen again.
  const changeParticipants = (people: EntryParticipant[]) => {
    if (
      form &&
      !form.isGroup &&
      people.length > form.participants.length &&
      people.length > INDIVIDUAL_MAX_PARTICIPANTS
    ) {
      setParticipantLimitHit(true);
      return;
    }
    setParticipantLimitHit(false);
    const nextAge = ageAutomatic ? autoAgeCategory(people) : undefined;
    const ageMoved = nextAge !== undefined && nextAge !== choice.ageCategory;
    // Соло, Дуо and Тріо fit different nominations, so a new line-up asks
    // for the nomination again.
    const lineupMoved =
      !!form &&
      !form.isGroup &&
      lineupLabel(people.length) !== lineupLabel(form.participants.length);
    patch({
      participants: people,
      ...(ageMoved && { choice: { ...choice, ageCategory: nextAge } }),
      ...((ageMoved || lineupMoved) && {
        choiceChanged: true,
        nominationId: '',
      }),
    });
  };

  const participantsField = namesDancers && form && (
    <EntryParticipantsField
      label={form.isGroup ? GROUP_PARTICIPANTS_LABEL : undefined}
      notice={participantLimitHit ? INDIVIDUAL_MAX_PARTICIPANTS_MESSAGE : null}
      selected={form.participants}
      onAdd={(participant) =>
        changeParticipants([...form.participants, participant])
      }
      onRemove={(participantId) =>
        changeParticipants(
          form.participants.filter((p) => p.id !== participantId),
        )
      }
    />
  );

  const handleMusicPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingMusic(true);
    setMusicError(null);
    try {
      const uploaded = await uploadEntryTrack(entryId, file);
      setMusic((prev) =>
        prev ? { ...prev, name: uploaded.fileName, url: uploaded.musicUrl } : prev,
      );
      // The entries table shows the track, and its duration can change the
      // performance's timing.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.entries(competitionId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.timingScope(competitionId),
        }),
      ]);
    } catch (err) {
      setMusicError(
        err instanceof Error ? err.message : MUSIC_UPLOAD_FAILED_MESSAGE,
      );
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || submitting) return;
    if (form.isGroup && !form.routineName.trim()) {
      setSaveError(GROUP_NAME_REQUIRED_MESSAGE);
      return;
    }
    const headcount = parseHeadcount(form.headcount);
    if (form.isGroup && !namesDancers && !isGroupSize(headcount)) {
      setSaveError(GROUP_HEADCOUNT_REQUIRED_MESSAGE);
      return;
    }
    if (ageAutomatic && form.participants.length === 0) {
      setSaveError(GROUP_PARTICIPANTS_REQUIRED_MESSAGE);
      return;
    }
    if (form.choiceChanged && !form.nominationId) {
      setSaveError(NOMINATION_REQUIRED_MESSAGE);
      return;
    }
    setSubmitting(true);
    setSaveError(null);
    try {
      const trainerId = trainer ? await resolveCoachId(trainer) : undefined;
      const studioChanged = form.studioId !== form.initialStudioId;
      const saved = await updateEntry(competitionId, entryId, {
        ...(form.isGroup
          ? {
              routineName: form.routineName.trim(),
              ...(!namesDancers && { participantsCount: headcount }),
            }
          : { routineTitle: form.routineTitle.trim() }),
        ...(form.nominationId && { nominationId: form.nominationId }),
        ...(namesDancers && form.participants.length > 0 && {
          participantIds: form.participants.map((p) => p.id),
        }),
        ...(studioChanged && { studioId: form.studioId }),
        ...(trainerId && { trainerId }),
        city: form.city,
        ...(form.paymentMethod !== NO_PAYMENT_METHOD && {
          paymentMethod: form.paymentMethod,
        }),
      });
      onSaved(saved);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : ENTRY_SAVE_FAILED_MESSAGE,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="Редагувати заявку"
      onClose={onClose}
      closeDisabled={submitting}
    >
      {loadError && <p className={styles.error}>{loadError}</p>}
      {!loadError && !form && <p className={styles.status}>Завантаження...</p>}
      {form && (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {!form.isGroup && participantsField}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="entry-routine-name">
              {form.isGroup ? GROUP_NAME_LABEL : ROUTINE_TITLE_LABEL}
            </label>
            <input
              id="entry-routine-name"
              className={styles.input}
              maxLength={
                form.isGroup ? GROUP_NAME_MAX_LENGTH : ROUTINE_TITLE_MAX_LENGTH
              }
              value={form.isGroup ? form.routineName : form.routineTitle}
              onChange={(e) =>
                patch(
                  form.isGroup
                    ? { routineName: e.target.value }
                    : { routineTitle: e.target.value },
                )
              }
            />
          </div>

          {form.isGroup && (
            <>
              <div className={styles.two}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="entry-headcount">
                    {GROUP_HEADCOUNT_LABEL}
                  </label>
                  <input
                    id="entry-headcount"
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    min={GROUP_MIN_HEADCOUNT}
                    max={GROUP_MAX_PARTICIPANTS}
                    step={1}
                    readOnly={namesDancers}
                    value={
                      namesDancers
                        ? String(form.participants.length)
                        : form.headcount
                    }
                    onChange={(e) => patch({ headcount: e.target.value })}
                  />
                </div>
                <EntryReadonlyField
                  id="entry-lineup"
                  label={GROUP_LINEUP_LABEL}
                  value={GROUP_LINEUP_VALUE}
                />
              </div>
              <p className={styles.hint}>{GROUP_LINEUP_HINT}</p>
            </>
          )}

          <EntryCategoryFields
            competitionId={competitionId}
            ageAutomatic={ageAutomatic}
            headcount={
              namesDancers
                ? form.participants.length
                : parseHeadcount(form.headcount)
            }
            choice={choice}
            nominationId={form.nominationId}
            nominationName={form.nominationName}
            onChoiceChange={(changes) =>
              patch({
                choice: { ...choice, ...changes },
                choiceChanged: true,
                nominationId: '',
              })
            }
            onPickNomination={(nomination) =>
              patch({
                nominationId: nomination.id,
                nominationName: nomination.name,
              })
            }
          >
            {form.isGroup && participantsField}
          </EntryCategoryFields>

          {!form.isGroup && (
            <>
              <EntryReadonlyField
                id="entry-lineup"
                label={GROUP_LINEUP_LABEL}
                value={
                  form.participants.length > 0
                    ? lineupLabel(form.participants.length)
                    : GROUP_EMPTY_VALUE_LABEL
                }
              />
              <p className={styles.hint}>{PARTICIPANTS_LINEUP_HINT}</p>
            </>
          )}

          <EntryLeadersFields
            currentStudioName={form.studioName}
            currentChoreographer={form.choreographer}
            studioId={form.studioId}
            onStudioChange={(studioId) => patch({ studioId })}
            onTrainerChange={setTrainer}
          />

          <div className={styles.field}>
            <label className={styles.label} htmlFor="entry-city">
              Місто
            </label>
            <input
              id="entry-city"
              className={styles.input}
              value={form.city}
              onChange={(e) => patch({ city: e.target.value })}
            />
          </div>

          <div className={styles.two}>
            <div className={styles.field}>
              <span className={styles.label}>Спосіб оплати</span>
              <div className={styles.toggle}>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      aria-pressed={form.paymentMethod === method}
                      onClick={() => patch({ paymentMethod: method })}
                    >
                      {PAYMENT_METHOD_LABELS[method]}
                    </button>
                  ),
                )}
              </div>
            </div>
            <EntryReadonlyField
              id="entry-amount"
              label={AMOUNT_LABEL}
              value={formatEntryAmount(form.amount)}
            />
          </div>

          {form.improv && (
            <div className={styles.field}>
              <p className={styles.hint}>{IMPROVISATION_ENTRY_NOTE}</p>
            </div>
          )}

          {music && !music.trackNotNeeded && (
            <div className={styles.field}>
              <span className={styles.label}>{MUSIC_LABEL}</span>
              <div className={styles.musicRow}>
                {music.url ? (
                  <a href={music.url} target="_blank" rel="noreferrer">
                    {music.name}
                  </a>
                ) : (
                  <span>{music.name ?? MUSIC_NONE}</span>
                )}
                <label className={styles.musicPick}>
                  <input
                    type="file"
                    accept={AUDIO_ACCEPT}
                    hidden
                    disabled={uploadingMusic}
                    onChange={handleMusicPick}
                  />
                  {uploadingMusic
                    ? MUSIC_UPLOADING_LABEL
                    : music.name
                      ? MUSIC_REPLACE_LABEL
                      : MUSIC_ADD_LABEL}
                </label>
              </div>
              {musicError && <p className={styles.error}>{musicError}</p>}
            </div>
          )}

          {saveError && <p className={styles.error}>{saveError}</p>}
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Збереження…' : 'Зберегти'}
          </button>
        </form>
      )}
    </Modal>
  );
}
