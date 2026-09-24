import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getApplyEligibility, getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import {
  getNominationAxes,
  getNominationsForEntry,
  getSpecialNominations,
} from '../lib/nominations';
import type { Nomination, NominationCategoryRange } from '../lib/nominations';
import type {
  NominationAxes,
  NominationEntryFilter,
} from '../lib/nominations.types';
import {
  AGE_CATEGORY_TYPE,
  LEAGUE_CATEGORY_TYPE,
  LINEUP_CATEGORY_TYPE,
  STYLE_CATEGORY_TYPE,
} from '../lib/categories';
import { fitsCount } from '../lib/categoryRange';
import { exitsAreAllImprovisation } from '../lib/improvisationProgram';
import { nominationRowKey } from '../lib/nominationRowKey';
import {
  EntryApiError,
  createEntriesBulk,
  uploadEntryTrack,
} from '../lib/entries';
import type { Entry } from '../lib/entries';
import {
  ParticipantApiError,
  createParticipant,
  getParticipants,
} from '../lib/participants';
import type { Participant } from '../lib/participants';
import {
  PARTICIPANT_SEARCH_DEBOUNCE_MS,
  PARTICIPANT_SEARCH_MIN_CHARS,
} from '../lib/participants.constants';
import { getSchool } from '../lib/schools';
import { formatEntryAmount } from '../lib/entryAmount';
import { useEntriesQuote } from '../lib/useEntriesQuote';
import { SPECIAL_PAID_ONCE_LABEL } from '../lib/entriesQuote.constants';
import {
  createCoach,
  getMyMentorCoach,
  getSelectableCoaches,
  getSession,
  refreshSession,
} from '../lib/auth';
import type { CoachSummary, SetMentorCoachBody } from '../lib/auth';
import { completeProfile } from '../lib/users';
import { refreshProgram } from '../lib/programCache';
import MentorCoachPicker from '../components/MentorCoachPicker';
import SchoolPicker from '../components/SchoolPicker';
import CategoryDescriptionList from '../components/CategoryDescriptionList';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import {
  ageCategoriesFittingAges,
  participantAges,
} from '../lib/ageEligibility';
import {
  AGE_CATEGORY_PLACEHOLDER,
  NO_COMMON_AGE_CATEGORY_HINT,
  NO_NOMINATIONS_FOR_AGE_MESSAGE,
} from '../lib/applyAge.constants';
import {
  NOMINATIONS_LOAD_FAILED_MESSAGE,
  SPECIAL_NOMINATIONS_LOAD_FAILED_MESSAGE,
} from '../lib/applyNominations.constants';
import { AUDIO_ACCEPT } from '../lib/uploads.constants';
import styles from './ApplyPage.module.css';

type PayMethod = 'cash' | 'card';

interface NominationRow {
  key: string;
  nominationId: string;
  improv: boolean;
  // The entries this row creates take no track: either the row itself is
  // the nomination's improvisation, or every exit is an improvisation
  // program. Display only — `improv` is what the entry is created with.
  takesNoTrack: boolean;
  isSpecial: boolean;
  label: string;
  price: number | null;
}

interface SelectableParticipant {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
}

const MY_ENTRIES_PATH = '/my-entries';

function fullName(p: { lastName: string; firstName: string }): string {
  return `${p.lastName} ${p.firstName}`.trim();
}

function coachOptionLabel(coach: CoachSummary): string {
  const name = fullName(coach);
  return coach.schoolName ? `${name} — ${coach.schoolName}` : name;
}

// Mirrors the server's resolveLineup: Соло / Дуо / Тріо / Група by count.
function lineupLabel(count: number): string {
  if (count >= 4) return 'Група';
  if (count === 3) return 'Тріо';
  if (count === 2) return 'Дуо';
  return 'Соло';
}

// Does a nomination's line-up category fit the number of picked dancers?
// Соло — 1, Дует/Дуо — 2, Тріо — 3, Група/Формейшн — 3+.
function lineupNameMatches(categoryName: string, count: number): boolean {
  const name = categoryName.trim().toLowerCase();
  if (name.startsWith('соло')) return count === 1;
  if (name.startsWith('дует') || name.startsWith('дуо')) return count === 2;
  if (name.startsWith('тріо') || name.startsWith('трио')) return count === 3;
  if (
    name.startsWith('груп') ||
    name.startsWith('формейшн') ||
    name.startsWith('ансамбль') ||
    name.startsWith('команд')
  ) {
    return count >= 3;
  }
  return true; // unrecognised line-up label — keep the nomination visible
}

// Кількість людей із довідника головніша за назву: саме її задає організатор
// у конструкторі. Розбір назви лишається запасним варіантом для складів, яким
// кількість ще не проставили.
function lineupMatches(lineup: NominationCategoryRange, count: number): boolean {
  if (lineup.rangeFrom !== null) return fitsCount(lineup, count);
  return lineupNameMatches(lineup.name, count);
}

function matchAgeCategory(
  age: number,
  categories: NominationCategoryRange[],
): string | null {
  const hit = categories.find((c) => {
    if (c.rangeFrom === null && c.rangeTo === null) return false;
    const from = c.rangeFrom ?? Number.NEGATIVE_INFINITY;
    const to = c.rangeTo ?? Number.POSITIVE_INFINITY;
    return age >= from && age <= to;
  });
  return hit ? hit.name : null;
}

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Read once: the session only changes on login/logout, which unmounts
  // this page anyway.
  const session = useMemo(() => getSession(), []);

  const [competition, setCompetition] = useState<Competition | null>(null);
  // Осі конкурсу замість усіх його номінацій: випадні списки будуються з
  // десятка значень, а рядки номінацій приходять уже під конкретний вибір
  // заявника. Тягнути сюди шість тисяч номінацій нема потреби — і саме на
  // цьому губились вікові категорії, що не влізли в ліміт відповіді.
  const [axes, setAxes] = useState<NominationAxes | null>(null);
  const [specials, setSpecials] = useState<Nomination[]>([]);
  const [entryNominations, setEntryNominations] = useState<Nomination[]>([]);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [specialsError, setSpecialsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Picked dancers are held as full objects: a coach searches the roster by
  // name and a match may no longer be in the current results by the time
  // the form is submitted.
  const [selectedParticipants, setSelectedParticipants] = useState<
    SelectableParticipant[]
  >([]);
  const [participantQuery, setParticipantQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [studioName, setStudioName] = useState<string | null>(null);
  // Coach + studio for an applicant whose profile has no mentor coach yet:
  // filled through the pickers below, saved to the profile on submit.
  const [coachName, setCoachName] = useState<string | null>(null);
  const [mentor, setMentor] = useState<SetMentorCoachBody | null>(null);
  const [mentorSchoolId, setMentorSchoolId] = useState(
    session?.profile.schoolId ?? '',
  );
  // Organizer/admin only: the studio and trainer the entry is filed under,
  // instead of the dancer's own. Left empty, the server keeps the dancer's.
  const [assignedStudioId, setAssignedStudioId] = useState('');
  const [assignedTrainer, setAssignedTrainer] =
    useState<SetMentorCoachBody | null>(null);
  const [trainerPickerKey, setTrainerPickerKey] = useState(0);
  const [league, setLeague] = useState('');
  const [pickedAgeCategory, setPickedAgeCategory] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [musicFileByKey, setMusicFileByKey] = useState<Record<string, File>>(
    {},
  );

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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const isCoach = session
    ? meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.COACH)
    : false;
  // A coach never picks: the server files their dancers under them. An
  // organizer or admin may name a coach, or leave the dancer without one.
  const canPickCoach = session
    ? meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ORGANIZER)
    : false;
  const coachSchoolId = session?.profile.schoolId ?? null;
  // Anyone with a birth date can enter themselves in a number.
  const selfAsOption = useMemo<SelectableParticipant | null>(() => {
    if (!session || !session.profile.birthDate) return null;
    const { id, firstName, lastName, birthDate } = session.profile;
    return { id, firstName, lastName, birthDate };
  }, [session]);
  // A plain participant applies only for themselves (a locked field). A
  // coach picks from their roster — and may include themselves in the list.
  const selfParticipant = isCoach ? null : selfAsOption;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([getCompetition(id), getNominationAxes(id)])
      .then(([c, competitionAxes]) => {
        if (cancelled) return;
        setCompetition(c);
        setAxes(competitionAxes);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити конкурс.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Name search over the roster — never loads every participant at once.
  useEffect(() => {
    if (!isCoach) return;
    const q = participantQuery.trim();
    let cancelled = false;
    const handle = setTimeout(() => {
      if (q.length < PARTICIPANT_SEARCH_MIN_CHARS) {
        setSearchResults([]);
        setSearching(false);
        setSearchError(null);
        return;
      }
      setSearching(true);
      getParticipants(q)
        .then((people) => {
          if (!cancelled) {
            setSearchResults(people);
            setSearchError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setSearchError('Не вдалося виконати пошук.');
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, PARTICIPANT_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [participantQuery, isCoach]);

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

  useEffect(() => {
    if (!coachSchoolId) return;
    let cancelled = false;
    getSchool(coachSchoolId)
      .then((school) => {
        if (!cancelled) setStudioName(school.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [coachSchoolId]);

  // A participant's studio and coach come from their mentor coach — pull
  // them in for display when the profile already has one.
  useEffect(() => {
    if (!session?.profile.coachId) return;
    let cancelled = false;
    getMyMentorCoach()
      .then((coach) => {
        if (cancelled || !coach) return;
        setCoachName(`${coach.lastName} ${coach.firstName}`.trim());
        setStudioName((prev) => prev ?? coach.schoolName);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Rows offered under the search box: the coach themselves (always
  // available, no search needed) plus whatever the current query matched,
  // minus anyone already picked.
  const searchOptions: SelectableParticipant[] = useMemo(() => {
    const pickedIds = new Set(selectedParticipants.map((p) => p.id));
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
  }, [searchResults, selectedParticipants, selfAsOption]);

  // A participant applies for themselves; a coach picks one (solo) or
  // several (group number) from the roster.
  const effectiveParticipantIds = selfParticipant
    ? [selfParticipant.id]
    : selectedParticipants.map((p) => p.id);

  const activeParticipants = useMemo(
    () => (selfParticipant ? [selfParticipant] : selectedParticipants),
    [selfParticipant, selectedParticipants],
  );

  // Вісь ліги рахується й по спецномінаціях, тож ліга, яка трапляється
  // лише в них, у списку теж є — і має id, за яким її можна відфільтрувати.
  const leagueOptions = useMemo(
    () => (axes?.[LEAGUE_CATEGORY_TYPE] ?? []).map((value) => value.name),
    [axes],
  );

  const styleOptions = useMemo(
    () => (axes?.[STYLE_CATEGORY_TYPE] ?? []).map((value) => value.name),
    [axes],
  );

  const ageCategories = useMemo<NominationCategoryRange[]>(
    () =>
      (axes?.[AGE_CATEGORY_TYPE] ?? []).map(({ name, rangeFrom, rangeTo }) => ({
        name,
        rangeFrom,
        rangeTo,
      })),
    [axes],
  );

  const pickedCount = selfParticipant ? 1 : selectedParticipants.length;

  // Counted on the competition's start date; a category is offered only when
  // every picked dancer fits it — the same rule the server enforces on submit.
  const ages = useMemo(
    () =>
      competition
        ? participantAges(
            activeParticipants.map((p) => p.birthDate),
            competition.dateFrom,
          )
        : [],
    [competition, activeParticipants],
  );
  const participantAge = ages.length === 1 ? ages[0] : null;

  const ageCategoryOptions = useMemo(
    () => ageCategoriesFittingAges(ages, ageCategories),
    [ages, ageCategories],
  );

  // A single fitting category needs no choice; with several (overlapping
  // ranges) the coach's pick is used, and a pick that stopped fitting is ignored.
  const chosenAgeCategory =
    ageCategoryOptions.length === 1
      ? ageCategoryOptions[0].name
      : ageCategoryOptions.some((c) => c.name === pickedAgeCategory)
        ? pickedAgeCategory
        : '';

  // Вибір заявника в id значень осей — саме ними фільтрує сервер.
  const leagueId = useMemo(
    () =>
      (axes?.[LEAGUE_CATEGORY_TYPE] ?? []).find((value) => value.name === league)
        ?.id,
    [axes, league],
  );

  const ageCategoryId = useMemo(
    () =>
      (axes?.[AGE_CATEGORY_TYPE] ?? []).find(
        (value) => value.name === chosenAgeCategory,
      )?.id,
    [axes, chosenAgeCategory],
  );

  // Обрані значення осей — для пояснень, які адмін задав у довіднику.
  const chosenLeagueValues = useMemo(
    () =>
      (axes?.[LEAGUE_CATEGORY_TYPE] ?? []).filter(
        (value) => value.name === league,
      ),
    [axes, league],
  );
  const chosenAgeValues = useMemo(
    () =>
      (axes?.[AGE_CATEGORY_TYPE] ?? []).filter(
        (value) => value.name === chosenAgeCategory,
      ),
    [axes, chosenAgeCategory],
  );
  const chosenStyleValues = useMemo(
    () =>
      (axes?.[STYLE_CATEGORY_TYPE] ?? []).filter((value) =>
        selectedStyles.includes(value.name),
      ),
    [axes, selectedStyles],
  );
  // Кількість учасників жорстко задає склад: один танцюрист — не група.
  const chosenLineupValues = useMemo(
    () =>
      (axes?.[LINEUP_CATEGORY_TYPE] ?? []).filter((value) =>
        lineupMatches(value, pickedCount),
      ),
    [axes, pickedCount],
  );

  const styleIds = useMemo(
    () => chosenStyleValues.map((value) => value.id),
    [chosenStyleValues],
  );
  const lineupIds = useMemo(
    () => chosenLineupValues.map((value) => value.id),
    [chosenLineupValues],
  );

  const entryFilter = useMemo<NominationEntryFilter>(
    () => ({
      league: leagueId,
      ageCategory: ageCategoryId,
      styles: styleIds,
      lineups: lineupIds,
      // Поки категорію не обрано (підходить кілька), звужуємо за віком.
      ages: ageCategoryId ? [] : ages,
    }),
    [leagueId, ageCategoryId, styleIds, lineupIds, ages],
  );

  // Номінації приходять уже відфільтровані сервером — рівно ті, у яких цей
  // склад учасників може виступити.
  useEffect(() => {
    if (!id || pickedCount === 0 || styleIds.length === 0 || !leagueId) {
      setEntryNominations([]);
      setRowsError(null);
      return;
    }
    let cancelled = false;
    getNominationsForEntry(id, entryFilter)
      .then((rows) => {
        if (cancelled) return;
        setEntryNominations(rows);
        setRowsError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setEntryNominations([]);
        setRowsError(NOMINATIONS_LOAD_FAILED_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [id, leagueId, pickedCount, styleIds, entryFilter]);

  // Спецномінації звужує той самий сервер і за тими самими правилами:
  // стилю й складу в них немає, але ліга та вік є. Доки учасників і ліги
  // немає, фільтрувати ні за чим — і показувати нічого: список усіх
  // спецномінацій конкурсу заявнику нічого не каже.
  useEffect(() => {
    if (!id || pickedCount === 0 || !leagueId) {
      setSpecials([]);
      setSpecialsError(null);
      return;
    }
    // Рядки під попередню лігу чи вік не мають лишатися обраними, поки
    // вантажаться нові.
    setSpecials([]);
    setSpecialsError(null);
    let cancelled = false;
    getSpecialNominations(id, {
      league: leagueId,
      ageCategory: ageCategoryId,
      // Поки категорію не обрано (підходить кілька), звужуємо за віком —
      // точно як для звичайних номінацій.
      ages: ageCategoryId ? [] : ages,
    })
      .then((rows) => {
        if (cancelled) return;
        setSpecials(rows);
        setSpecialsError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setSpecials([]);
        setSpecialsError(SPECIAL_NOMINATIONS_LOAD_FAILED_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [id, leagueId, ageCategoryId, pickedCount, ages]);

  const styleRows: NominationRow[] = useMemo(() => {
    const rows: NominationRow[] = [];
    for (const n of entryNominations) {
      rows.push({
        key: nominationRowKey(n.id, false),
        nominationId: n.id,
        improv: false,
        takesNoTrack: exitsAreAllImprovisation(n.exits),
        isSpecial: false,
        label: n.name,
        price: n.price,
      });
      if (n.allowsImprovisation) {
        rows.push({
          key: nominationRowKey(n.id, true),
          nominationId: n.id,
          improv: true,
          takesNoTrack: true,
          isSpecial: false,
          label: `${n.name} · Імпровізація`,
          price: n.price,
        });
      }
    }
    return rows;
  }, [entryNominations]);

  const specialRows: NominationRow[] = useMemo(
    () =>
      specials.map((n) => ({
        key: nominationRowKey(n.id, false),
        nominationId: n.id,
        improv: false,
        takesNoTrack: exitsAreAllImprovisation(n.exits),
        isSpecial: true,
        label: n.name,
        price: n.price,
      })),
    [specials],
  );

  const allRows = useMemo(
    () => [...styleRows, ...specialRows],
    [styleRows, specialRows],
  );

  // Номінація, що зникла зі списку (змінилась ліга, вік чи стилі), знімається
  // з вибору: повернувшись, вона не має бути обраною сама собою.
  useEffect(() => {
    const visibleKeys = new Set(allRows.map((row) => row.key));
    setSelectedKeys((prev) => {
      const kept = prev.filter((key) => visibleKeys.has(key));
      return kept.length === prev.length ? prev : kept;
    });
  }, [allRows]);

  const selectedRows = allRows.filter((r) => selectedKeys.includes(r.key));
  const quote = useEntriesQuote(
    id,
    effectiveParticipantIds,
    selectedRows.map((r) => r.nominationId),
  );
  const quoteAmountByKey = new Map(
    quote.status === 'ready'
      ? selectedRows.map((r, index) => [r.key, quote.amounts[index]])
      : [],
  );
  const total =
    quote.status === 'ready' || quote.status === 'loading' ? quote.total : null;

  // Which required field to highlight red — mirrors the checks in
  // handleSubmit, so the invalid one stays marked until it's actually fixed.
  const participantsInvalid =
    submitError != null && effectiveParticipantIds.length === 0;
  const leagueInvalid = submitError != null && !league;
  const nominationsInvalid = submitError != null && selectedRows.length === 0;

  const ageLabel = (() => {
    if (activeParticipants.length === 0) return '—';
    if (activeParticipants.length > 1) {
      return `Груповий номер · ${activeParticipants.length} учасників`;
    }
    if (participantAge === null) return '—';
    const category = matchAgeCategory(participantAge, ageCategories);
    return category
      ? `${participantAge} р. · ${category}`
      : `${participantAge} р.`;
  })();

  const coachLabel = isCoach && session
    ? fullName(session.profile)
    : coachName ?? '—';

  const studioLabel = studioName ?? '—';

  const toggleStyle = (style: string) => {
    setSubmitError(null);
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style],
    );
  };

  const toggleRow = (key: string) => {
    setSubmitError(null);
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const addParticipant = (person: SelectableParticipant) => {
    setSubmitError(null);
    setSelectedParticipants((prev) =>
      prev.some((p) => p.id === person.id) ? prev : [...prev, person],
    );
  };

  const removeParticipant = (pid: string) => {
    setSubmitError(null);
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== pid));
  };

  const setMusicForRow = (key: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMusicFileByKey((prev) => ({ ...prev, [key]: file }));
  };

  const handleCreateParticipant = async () => {
    setNewParticipantError(null);
    const { firstName, lastName, phone, birthDate } = newParticipant;
    if (!firstName.trim() || !lastName.trim()) {
      setNewParticipantError('Вкажіть імʼя та прізвище.');
      return;
    }
    if (!phone.trim()) {
      setNewParticipantError('Телефон обовʼязковий.');
      return;
    }
    if (!birthDate) {
      setNewParticipantError('Вкажіть дату народження.');
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
      addParticipant({
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
          : 'Не вдалося створити учасника.',
      );
    }
  };

  const resetForm = () => {
    setSelectedParticipants([]);
    setParticipantQuery('');
    setSearchResults([]);
    setLeague('');
    setPickedAgeCategory('');
    setSelectedStyles([]);
    setSelectedKeys([]);
    setCity('');
    setPayMethod('card');
    setMusicFileByKey({});
    setMentor(null);
    setAssignedStudioId('');
    setAssignedTrainer(null);
    setTrainerPickerKey((key) => key + 1);
    setCreatedCount(0);
    setSubmitError(null);
  };

  // A trainer typed in by hand is registered first, so the entry only ever
  // carries a real trainer id.
  const resolveAssignedTrainerId = async (): Promise<string | undefined> => {
    if (!assignedTrainer) return undefined;
    if ('coachId' in assignedTrainer) return assignedTrainer.coachId;
    return (await createCoach(assignedTrainer.newCoach)).id;
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitError(null);

    if (effectiveParticipantIds.length === 0) {
      setSubmitError('Оберіть або створіть щонайменше одного учасника.');
      return;
    }
    if (!league) {
      setSubmitError('Оберіть лігу для цієї заявки.');
      return;
    }
    const rows = allRows.filter((r) => selectedKeys.includes(r.key));
    if (rows.length === 0) {
      setSubmitError('Оберіть хоча б одну номінацію.');
      return;
    }
    if (mentor && isCoach && !mentorSchoolId.trim()) {
      setSubmitError('Оберіть школу, щоб зберегти керівника.');
      return;
    }

    setSubmitting(true);
    try {
      // A picked/typed coach is saved to the profile first; the backend
      // then resolves the entry's studio and choreographer from it.
      if (mentor) {
        try {
          await completeProfile(
            isCoach ? { ...mentor, schoolId: mentorSchoolId.trim() } : mentor,
          );
          await refreshSession();
          setMentor(null);
        } catch (err) {
          setSubmitError(
            err instanceof Error
              ? err.message
              : 'Не вдалося зберегти керівника у профілі.',
          );
          return;
        }
      }
      const trainerId = canPickCoach
        ? await resolveAssignedTrainerId()
        : undefined;
      const created = await createEntriesBulk(
        id,
        rows.map((r) => ({
          participantIds: effectiveParticipantIds,
          studioId: canPickCoach ? assignedStudioId || undefined : undefined,
          trainerId,
          nominationId: r.nominationId,
          improv: r.improv,
          city: city.trim() || undefined,
          paymentMethod: payMethod,
        })),
      );
      setCreatedCount(created.length);
      // The server may have placed the new exits straight into a formed
      // program; otherwise they joined the unassigned pool.
      void refreshProgram(queryClient, id);

      // The server creates one entry per exit, so a per-program nomination
      // comes back as several entries for a single row and the two lists do
      // not line up by index. Each entry names the row it came from.
      const createdByRowKey = new Map<string, Entry[]>();
      for (const entry of created) {
        if (!entry.nominationId) continue;
        const key = nominationRowKey(entry.nominationId, entry.improv ?? false);
        const group = createdByRowKey.get(key);
        if (group) group.push(entry);
        else createdByRowKey.set(key, [entry]);
      }

      // Entries exist now, so their ids are stable — upload each picked
      // file for real instead of just remembering its name. One picked file
      // covers every exit of its row; the improvisation exits of a mixed
      // nomination take no track and would refuse the upload.
      const uploads = await Promise.allSettled(
        rows.map((r) => {
          const file = musicFileByKey[r.key];
          if (!file) return null;
          const targets = (createdByRowKey.get(r.key) ?? []).filter(
            (entry) => !entry.trackNotNeeded,
          );
          return Promise.all(
            targets.map((entry) => uploadEntryTrack(entry.id, file)),
          );
        }),
      );
      const failedCount = uploads.filter((u) => u.status === 'rejected').length;
      if (failedCount > 0) {
        setSubmitError(
          `Заявку подано, але не вдалося завантажити музику для ${failedCount} з ${rows.length}. Довантажте її пізніше в кабінеті.`,
        );
      }
    } catch (err) {
      setSubmitError(
        err instanceof EntryApiError
          ? err.message
          : 'Не вдалося надіслати заявку. Спробуйте ще раз.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!id) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Заявка на конкурс</p>
          <h1>Оберіть конкурс</h1>
          <p>
            Ця сторінка призначена для подання заявки на конкретний конкурс —
            перейдіть за посиланням «Форма подачі заявки» зі сторінки потрібного
            конкурсу.
          </p>
          <Link to="/" className={styles.home}>
            ← На головну
          </Link>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.error}>{loadError}</p>
          <Link to="/" className={styles.home}>
            ← На головну
          </Link>
        </div>
      </main>
    );
  }

  if (!competition || !axes) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>Завантаження...</div>
      </main>
    );
  }

  // Registration closed → only organizers/admins may still add entries here.
  // Competition over → no one but admins.
  const applyEligibility = getApplyEligibility(competition, {
    isOrganizer: !!session && meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ORGANIZER),
    isAdmin: !!session && meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ADMIN),
  });
  if (!applyEligibility.allowed) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Заявка на конкурс</p>
          <h1>{competition.name}</h1>
          <p className={styles.error}>{applyEligibility.reason}</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Link to={MY_ENTRIES_PATH} className={styles.home}>
              Переглянути подані заявки →
            </Link>
            <Link to={`/competitions/${id}`} className={styles.home}>
              ← До конкурсу
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (createdCount > 0) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Заявка на конкурс</p>
          <h1>{competition.name}</h1>
          <div className={styles.successWrap}>
            <p className={styles.successTitle}>Заявку надіслано!</p>
            <p className={styles.hint}>
              Організатор отримав вашу заявку та розгляне її найближчим часом.
            </p>
            {submitError && <p className={styles.error}>{submitError}</p>}
            <div className={styles.successActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => navigate(MY_ENTRIES_PATH)}
              >
                До моїх заявок
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={resetForm}
              >
                Подати ще одну заявку
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Лігу несе кожна звичайна номінація (сервер цього вимагає), тож порожня
  // вісь ліг разом із відсутністю спецномінацій і означає «номінацій немає».
  const noNominations =
    axes[LEAGUE_CATEGORY_TYPE].length === 0 && specials.length === 0;

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Заявка на конкурс</p>
        <h1>{competition.name}</h1>
        <Link to={`/competitions/${id}`} className={styles.home}>
          ← До сторінки конкурсу
        </Link>

        {submitError && <p className={styles.error}>{submitError}</p>}

        <div className={styles.grid}>
          <div>
            <label className={styles.label}>
              Учасники <span className={styles.req}>*</span>
            </label>

            {selfParticipant ? (
              <div className={styles.readonlyBox}>
                {fullName(selfParticipant)}
              </div>
            ) : (
              <>
                {selectedParticipants.length > 0 && (
                  <div className={styles.chips}>
                    {selectedParticipants.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`${styles.chip} ${styles.chipOn}`}
                        onClick={() => removeParticipant(p.id)}
                      >
                        {fullName(p)} ✕
                      </button>
                    ))}
                  </div>
                )}

                <input
                  className={`${styles.textInput} ${
                    participantsInvalid ? styles.invalid : ''
                  }`}
                  type="text"
                  placeholder="Почніть вводити прізвище учасника…"
                  value={participantQuery}
                  onChange={(e) => setParticipantQuery(e.target.value)}
                />

                {participantQuery.trim().length > 0 &&
                  participantQuery.trim().length < PARTICIPANT_SEARCH_MIN_CHARS && (
                    <p className={styles.hint}>
                      Введіть щонайменше {PARTICIPANT_SEARCH_MIN_CHARS} літери.
                    </p>
                  )}
                {searching && <p className={styles.hint}>Пошук…</p>}
                {searchError && <p className={styles.error}>{searchError}</p>}

                {searchOptions.length > 0 && (
                  <div className={styles.nomList}>
                    {searchOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={styles.nomRow}
                        onClick={() => addParticipant(p)}
                      >
                        <span className={styles.nomCheck} />
                        <span className={styles.nomLabel}>{fullName(p)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!searching &&
                  !searchError &&
                  participantQuery.trim().length >=
                    PARTICIPANT_SEARCH_MIN_CHARS &&
                  searchOptions.length === 0 && (
                    <div className={styles.nomEmpty}>Нікого не знайдено.</div>
                  )}
                <p className={styles.hint}>
                  Оберіть одного для сольного номера або кількох для групового.
                </p>
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
                + Немає потрібного учасника — створити
              </button>
            )}

            {isCoach && showNewParticipant && (
              <div className={styles.subForm}>
                <div className={styles.subTitle}>Новий учасник</div>
                <div className={styles.subGrid}>
                  <input
                    className={styles.subInput}
                    placeholder="Імʼя"
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
                    placeholder="Прізвище"
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
                    placeholder="+380 63 700 10 11"
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
                        placeholder="Керівник — необовʼязково"
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
                    Додати й обрати
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhostSm}
                    onClick={() => {
                      setShowNewParticipant(false);
                      setNewParticipantError(null);
                    }}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}

            {activeParticipants.length > 0 && (
              <div className={styles.two}>
                <div>
                  <label className={styles.label}>
                    Ліга <span className={styles.req}>*</span>
                  </label>
                  <select
                    className={`${styles.select} ${
                      leagueInvalid ? styles.invalid : ''
                    }`}
                    value={league}
                    onChange={(e) => {
                      setLeague(e.target.value);
                      setSubmitError(null);
                    }}
                  >
                    <option value="">Оберіть лігу…</option>
                    {leagueOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <p className={styles.hint}>
                    Ліга обирається окремо для кожної заявки.
                  </p>
                  <CategoryDescriptionList
                    values={chosenLeagueValues}
                    className={styles.hint}
                  />
                </div>
                <div>
                  <label className={styles.label}>Вік / вікова категорія</label>
                  {ageCategoryOptions.length > 0 ? (
                    <select
                      className={styles.select}
                      value={chosenAgeCategory}
                      onChange={(e) => {
                        setPickedAgeCategory(e.target.value);
                        setSubmitError(null);
                      }}
                    >
                      {ageCategoryOptions.length > 1 && (
                        <option value="">{AGE_CATEGORY_PLACEHOLDER}</option>
                      )}
                      {ageCategoryOptions.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.rangeFrom}–{c.rangeTo})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={styles.readonlyBox}>{ageLabel}</div>
                  )}
                  {ages.length > 0 &&
                    ageCategories.length > 0 &&
                    ageCategoryOptions.length === 0 && (
                      <p className={styles.hint}>{NO_COMMON_AGE_CATEGORY_HINT}</p>
                    )}
                  <CategoryDescriptionList
                    values={chosenAgeValues}
                    className={styles.hint}
                  />
                </div>
              </div>
            )}

            {activeParticipants.length > 0 && (
              <div>
                <label className={styles.label}>Склад</label>
                <div className={styles.readonlyBox} data-testid="lineup-value">
                  {lineupLabel(effectiveParticipantIds.length)}
                </div>
                <p className={styles.hint}>
                  Визначається автоматично за кількістю обраних учасників.
                </p>
                <CategoryDescriptionList
                  values={chosenLineupValues}
                  className={styles.hint}
                />
              </div>
            )}
          </div>

          <div>
            <label className={styles.label}>
              Стилі <span className={styles.req}>*</span>
            </label>
            <div
              className={`${styles.chips} ${
                nominationsInvalid && selectedStyles.length === 0
                  ? styles.chipsInvalid
                  : ''
              }`}
            >
              {styleOptions.map((style) => {
                const on = selectedStyles.includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                    onClick={() => toggleStyle(style)}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
            <p className={styles.hint}>
              Доступні стилі з шаблону, за яким створено конкурс. Можна обрати
              кілька — заявка буде подана в кожну номінацію. Імпровізація — це
              окремий рядок у списку номінацій нижче.
            </p>
            <CategoryDescriptionList
              values={chosenStyleValues}
              className={styles.hint}
            />
            {noNominations && (
              <p className={styles.error}>
                Для цього конкурсу ще не згенеровано номінацій.
              </p>
            )}
          </div>

          {selectedStyles.length > 0 && (
            <div>
              <label className={styles.label}>Номінації за обраними стилями</label>
              {styleRows.length === 0 ? (
                <p className={styles.hint}>
                  {rowsError ??
                    (ages.length === 0
                      ? 'Немає номінацій для цього поєднання ліги та стилів.'
                      : NO_NOMINATIONS_FOR_AGE_MESSAGE)}
                </p>
              ) : (
                <div
                  className={`${styles.nomList} ${
                    nominationsInvalid ? styles.invalid : ''
                  }`}
                >
                  {styleRows.map((row) => {
                    const on = selectedKeys.includes(row.key);
                    return (
                      <button
                        key={row.key}
                        type="button"
                        className={`${styles.nomRow} ${on ? styles.nomRowOn : ''}`}
                        onClick={() => toggleRow(row.key)}
                      >
                        <span
                          className={`${styles.nomCheck} ${on ? styles.nomCheckOn : ''}`}
                        >
                          {on ? '✓' : ''}
                        </span>
                        <span className={styles.nomLabel}>{row.label}</span>
                        <span className={styles.nomPrice}>
                          {formatEntryAmount(row.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(specialRows.length > 0 || specialsError !== null) && (
            <div>
              <label className={styles.label}>Спеціальні номінації</label>
              {specialsError !== null ? (
                <p className={styles.hint}>{specialsError}</p>
              ) : (
                <div
                  className={`${styles.nomList} ${
                    nominationsInvalid ? styles.invalid : ''
                  }`}
                >
                  {specialRows.map((row) => {
                    const on = selectedKeys.includes(row.key);
                    return (
                      <button
                        key={row.key}
                        type="button"
                        className={`${styles.nomRow} ${on ? styles.nomRowOn : ''}`}
                        onClick={() => toggleRow(row.key)}
                      >
                        <span
                          className={`${styles.nomCheck} ${on ? styles.nomCheckOn : ''}`}
                        >
                          {on ? '✓' : ''}
                        </span>
                        <span className={styles.nomLabel}>{row.label}</span>
                        <span className={styles.nomPrice}>
                          {on &&
                          row.price !== null &&
                          row.price > 0 &&
                          quoteAmountByKey.get(row.key) === 0
                            ? SPECIAL_PAID_ONCE_LABEL
                            : formatEntryAmount(row.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className={styles.hint}>
                Номінації поза сіткою стилів — наприклад «Гран-прі
                конкурсу». Показані ті, що підходять обраній лізі та віку учасників.
              </p>
            </div>
          )}

          {selectedRows.length > 0 && (
            <p className={styles.hint}>
              {selectedRows.length === 1
                ? 'Буде створено 1 заявку — по одній на кожну номінацію.'
                : `Буде створено ${selectedRows.length} заявки — по одній на кожну номінацію.`}
            </p>
          )}

          {activeParticipants.length > 0 &&
            canPickCoach && (
              <div>
                <SchoolPicker
                  value={assignedStudioId}
                  onChange={setAssignedStudioId}
                />
                <label className={styles.label}>Керівник</label>
                <MentorCoachPicker
                  key={trainerPickerKey}
                  onChange={setAssignedTrainer}
                />
                <p className={styles.hint}>
                  Необовʼязково. Оберіть будь-яку студію й керівника або
                  створіть нових — заявка зʼявиться у цього керівника в «Моїх
                  заявках». Якщо не вказувати, буде взято студію й керівника
                  учасника.
                </p>
              </div>
            )}

          {activeParticipants.length > 0 &&
            !canPickCoach &&
            (session.profile.coachId ? (
              <div className={styles.two}>
                <div>
                  <label className={styles.label}>Студія</label>
                  <div className={styles.readonlyBox}>{studioLabel}</div>
                </div>
                <div>
                  <label className={styles.label}>Керівник</label>
                  <div className={styles.readonlyBox}>{coachLabel}</div>
                </div>
              </div>
            ) : (
              <div>
                {isCoach && (
                  <SchoolPicker
                    value={mentorSchoolId}
                    onChange={setMentorSchoolId}
                  />
                )}
                <label className={styles.label}>Керівник</label>
                <MentorCoachPicker onChange={setMentor} />
                <p className={styles.hint}>
                  Необовʼязково. Якщо вкажете керівника, він і його студія
                  збережуться у вашому профілі та підтягнуться в майбутні
                  заявки.
                </p>
              </div>
            ))}

          <div>
            <label className={styles.label}>Місто</label>
            <input
              className={styles.textInput}
              type="text"
              placeholder="Львів"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className={styles.two}>
            <div>
              <label className={styles.label}>Спосіб оплати</label>
              <div className={styles.toggle}>
                <button
                  type="button"
                  aria-pressed={payMethod === 'cash'}
                  onClick={() => setPayMethod('cash')}
                >
                  Готівка
                </button>
                <button
                  type="button"
                  aria-pressed={payMethod === 'card'}
                  onClick={() => setPayMethod('card')}
                >
                  Картка
                </button>
              </div>
            </div>
            <div>
              <label className={styles.label}>Сума до сплати</label>
              <div className={styles.readonlyBox}>
                {formatEntryAmount(total)}
              </div>
            </div>
          </div>

          {selectedRows.length > 0 && (
            <div>
              <label className={styles.label}>Музика для виступів</label>
              <div className={styles.musicList}>
                {selectedRows.map((row) =>
                  row.takesNoTrack ? (
                    <div key={row.key} className={styles.musicRow}>
                      <span className={styles.musicLabel}>{row.label}</span>
                      <span className={styles.hint}>
                        Для імпровізації трек не завантажується.
                      </span>
                    </div>
                  ) : (
                    <div key={row.key} className={styles.musicRow}>
                      <span className={styles.musicLabel}>{row.label}</span>
                      <input
                        className={styles.fileInput}
                        type="file"
                        accept={AUDIO_ACCEPT}
                        onChange={(e) => setMusicForRow(row.key, e)}
                      />
                      {musicFileByKey[row.key] && (
                        <span className={styles.hint}>
                          Обрано: {musicFileByKey[row.key].name}
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.submit}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? 'Надсилання...'
              : selectedRows.length > 1
                ? `Надіслати ${selectedRows.length} заявки`
                : 'Надіслати заявку'}
          </button>
        </div>
      </div>
    </main>
  );
}
