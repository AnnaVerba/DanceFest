import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getApplyEligibility, getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import ContestTitle from '../components/ContestTitle';
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
import {
  EntryApiError,
  createEntriesBulk,
  uploadEntryTrack,
} from '../lib/entries';
import type { Entry } from '../lib/entries';
import { getSchool } from '../lib/schools';
import { formatEntryAmount } from '../lib/entryAmount';
import { useEntriesQuote } from '../lib/useEntriesQuote';
import { SPECIAL_PAID_ONCE_LABEL } from '../lib/entriesQuote.constants';
import {
  createCoach,
  getMyMentorCoach,
  getSession,
  refreshSession,
} from '../lib/auth';
import type { SetMentorCoachBody } from '../lib/auth';
import { completeProfile } from '../lib/users';
import { refreshProgram } from '../lib/programCache';
import MentorCoachPicker from '../components/MentorCoachPicker';
import SchoolPicker from '../components/SchoolPicker';
import CategoryDescriptionList from '../components/CategoryDescriptionList';
import ApplyAgeField from './apply/ApplyAgeField';
import ApplyLeagueField from './apply/ApplyLeagueField';
import ApplyTabs from './apply/ApplyTabs';
import GroupLineupFields from './apply/GroupLineupFields';
import LineupModeToggle from './apply/LineupModeToggle';
import ParticipantPicker from './apply/ParticipantPicker';
import { ACCESS_LEVEL, isStudioStaff, meetsLevel } from '../lib/roles';
import {
  ENTRY_HEAD_LABEL,
  ENTRY_TRAINER_LABEL,
  NOMINATIONS_BY_STYLES_LABEL,
  NOMINATIONS_LABEL,
  PARTICIPANTS_REQUIRED_MESSAGE,
} from './ApplyPage.constants';
import {
  APPLY_TAB,
  INDIVIDUAL_MAX_PARTICIPANTS,
  INDIVIDUAL_MAX_PARTICIPANTS_MESSAGE,
} from '../lib/applyTabs.constants';
import type { ApplyTab } from '../lib/applyTabs.types';
import type { SelectableParticipant } from '../lib/applyParticipants.types';
import { NO_HINT } from '../lib/participantPicker.constants';
import {
  GROUP_HEADCOUNT_REQUIRED_MESSAGE,
  GROUP_EMPTY_VALUE_LABEL,
  GROUP_LINEUP_VALUE,
  GROUP_NAME_REQUIRED_MESSAGE,
  GROUP_NOMINATIONS_NONE_SELECTED_HINT,
  GROUP_PARTICIPANTS_LABEL,
  GROUP_PARTICIPANTS_REQUIRED_MESSAGE,
  LINEUP_MODE,
  NO_GROUP_NOMINATIONS_MESSAGE,
  NO_HEADCOUNT,
} from '../lib/groupApply.constants';
import type { LineupMode } from '../lib/groupApply.types';
import { isGroupSize, parseHeadcount } from '../lib/groupApply';
import {
  ageCategoriesFittingAnyAge,
  participantAges,
} from '../lib/ageEligibility';
import {
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
  // The entries this row creates take no track: every exit is an
  // improvisation. Display only — the server derives each entry's flag.
  takesNoTrack: boolean;
  isSpecial: boolean;
  label: string;
  price: number | null;
}

const MY_ENTRIES_PATH = '/my-entries';

function fullName(p: { lastName: string; firstName: string }): string {
  return `${p.lastName} ${p.firstName}`.trim();
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

  const [activeTab, setActiveTab] = useState<ApplyTab>(APPLY_TAB.INDIVIDUAL);
  // Picked dancers are held as full objects: a coach searches the roster by
  // name and a match may no longer be in the current results by the time
  // the form is submitted.
  const [selectedParticipants, setSelectedParticipants] = useState<
    SelectableParticipant[]
  >([]);
  // Set when a pick was refused for going over the solo/duo/trio limit.
  const [participantLimitHit, setParticipantLimitHit] = useState(false);
  // A group is registered by its name and either a headcount or named dancers.
  const [groupName, setGroupName] = useState('');
  const [headcountInput, setHeadcountInput] = useState('');
  const [lineupMode, setLineupMode] = useState<LineupMode>(LINEUP_MODE.COUNT);
  const [studioName, setStudioName] = useState<string | null>(null);
  // Coach + studio for an applicant whose profile has no mentor coach yet:
  // filled through the pickers below, saved to the profile on submit.
  const [coachName, setCoachName] = useState<string | null>(null);
  const [mentor, setMentor] = useState<SetMentorCoachBody | null>(null);
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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const isCoach = session
    ? meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.TRAINER)
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

  // Studio staff file entries under their own studio and themselves — the
  // server fills both in, so there is nothing to pick. They also see their
  // own dancers (and a head — the studio's trainers) before typing; the
  // server caps that list. An organizer searches everyone, so types first.
  const isStaffSubmitter =
    !!session && isStudioStaff(session.profile.accessLevel);

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

  const isGroupTab = activeTab === APPLY_TAB.GROUP;
  // Every number names its dancers, except a group that gives only its size.
  const namesDancers = !isGroupTab || lineupMode === LINEUP_MODE.NAMED;

  // A participant applies for themselves; a coach picks one (solo) or
  // several (group number) from the roster.
  const activeParticipants = useMemo(() => {
    if (!namesDancers) return [];
    return selfParticipant ? [selfParticipant] : selectedParticipants;
  }, [namesDancers, selfParticipant, selectedParticipants]);
  const effectiveParticipantIds = activeParticipants.map((p) => p.id);

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
  // A competition whose nominations carry no style skips the style step:
  // its nominations are listed straight after league and age.
  const hasStyles = styleOptions.length > 0;
  const stylesChosen = !hasStyles || selectedStyles.length > 0;

  const ageCategories = useMemo<NominationCategoryRange[]>(
    () =>
      (axes?.[AGE_CATEGORY_TYPE] ?? []).map(({ name, rangeFrom, rangeTo }) => ({
        name,
        rangeFrom,
        rangeTo,
      })),
    [axes],
  );

  // How many dancers the number puts on stage: the named ones, or the
  // headcount a group typed. A group counts only once its size is one the
  // server accepts, so a smaller one means nothing is chosen yet.
  const headcount = namesDancers
    ? effectiveParticipantIds.length
    : parseHeadcount(headcountInput);
  const pickedCount =
    isGroupTab && !isGroupSize(headcount) ? NO_HEADCOUNT : headcount;

  // Counted on the competition's start date; a category is offered when at
  // least one picked dancer fits it — the same rule the server enforces on submit.
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
    () => ageCategoriesFittingAnyAge(ages, ageCategories),
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
  // Опис категорії за назвою — щоб показати його прямо в опції випадного
  // списку, ще до того як людина зробить вибір.
  const ageDescriptionByName = useMemo(
    () =>
      new Map(
        (axes?.[AGE_CATEGORY_TYPE] ?? []).map((value) => [
          value.name,
          value.description,
        ]),
      ),
    [axes],
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
  const entryFilter = useMemo<NominationEntryFilter>(
    () => ({
      league: leagueId,
      ageCategory: ageCategoryId,
      styles: styleIds,
      participants: pickedCount,
      // Поки категорію не обрано (підходить кілька), звужуємо за віком.
      ages: ageCategoryId ? [] : ages,
    }),
    [leagueId, ageCategoryId, styleIds, pickedCount, ages],
  );

  // Номінації приходять уже відфільтровані сервером — рівно ті, у яких цей
  // склад учасників може виступити. Група бачить їх одразу, щойно має склад:
  // ліга їх лише звужує.
  useEffect(() => {
    if (
      !id ||
      pickedCount === 0 ||
      !stylesChosen ||
      (!isGroupTab && !leagueId)
    ) {
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
  }, [id, leagueId, pickedCount, stylesChosen, isGroupTab, entryFilter]);

  // Спецномінації звужує той самий сервер і за тими самими правилами:
  // стилю в них немає, але ліга, вік, а подекуди й склад є. Доки учасників і ліги
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
      participants: pickedCount,
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
        key: n.id,
        nominationId: n.id,
        takesNoTrack: exitsAreAllImprovisation(n.exits),
        isSpecial: false,
        label: n.isImprovisation ? `${n.name} · Імпровізація` : n.name,
        price: n.price,
      });
    }
    return rows;
  }, [entryNominations]);

  const specialRows: NominationRow[] = useMemo(
    () =>
      specials.map((n) => ({
        key: n.id,
        nominationId: n.id,
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
  // A group that gives only its size is priced by that size alone.
  const quote = useEntriesQuote(
    id,
    effectiveParticipantIds,
    selectedRows.map((r) => r.nominationId),
    namesDancers || pickedCount === NO_HEADCOUNT ? undefined : pickedCount,
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
  const lineupInvalid = submitError != null && pickedCount === NO_HEADCOUNT;
  const participantsInvalid = lineupInvalid && namesDancers;
  const headcountInvalid = lineupInvalid && !namesDancers;
  const groupNameInvalid =
    submitError != null && isGroupTab && !groupName.trim();
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

  const leaderLabel =
    session?.profile.accessLevel === ACCESS_LEVEL.TRAINER
      ? ENTRY_TRAINER_LABEL
      : ENTRY_HEAD_LABEL;

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
    if (selectedParticipants.some((p) => p.id === person.id)) return;
    // Past three dancers it is a group, which has its own tab.
    if (!isGroupTab && selectedParticipants.length >= INDIVIDUAL_MAX_PARTICIPANTS) {
      setParticipantLimitHit(true);
      return;
    }
    setParticipantLimitHit(false);
    setSelectedParticipants((prev) => [...prev, person]);
  };

  const removeParticipant = (pid: string) => {
    setSubmitError(null);
    setParticipantLimitHit(false);
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== pid));
  };

  const setMusicForRow = (key: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMusicFileByKey((prev) => ({ ...prev, [key]: file }));
  };

  // Each tab starts from a clean pick: the dancers, styles, nominations and
  // music chosen for one kind of number mean nothing for the other. League,
  // city, payment and studio carry over.
  const handleTabChange = (tab: ApplyTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSelectedParticipants([]);
    setParticipantLimitHit(false);
    setPickedAgeCategory('');
    setSelectedStyles([]);
    setSelectedKeys([]);
    setMusicFileByKey({});
    setSubmitError(null);
  };

  const handleLineupModeChange = (mode: LineupMode) => {
    setSubmitError(null);
    setLineupMode(mode);
  };

  const handleGroupNameChange = (name: string) => {
    setSubmitError(null);
    setGroupName(name);
  };

  const handleHeadcountChange = (headcountText: string) => {
    setSubmitError(null);
    setHeadcountInput(headcountText);
  };

  const handleAgeCategoryChange = (ageCategory: string) => {
    setSubmitError(null);
    setPickedAgeCategory(ageCategory);
  };

  const handleLeagueChange = (nextLeague: string) => {
    setSubmitError(null);
    setLeague(nextLeague);
  };

  const resetForm = () => {
    setSelectedParticipants([]);
    setParticipantLimitHit(false);
    setGroupName('');
    setHeadcountInput('');
    setLineupMode(LINEUP_MODE.COUNT);
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

  // What to tell the applicant while the number has no usable line-up.
  const missingLineupMessage = (): string => {
    if (!isGroupTab) return PARTICIPANTS_REQUIRED_MESSAGE;
    return namesDancers
      ? GROUP_PARTICIPANTS_REQUIRED_MESSAGE
      : GROUP_HEADCOUNT_REQUIRED_MESSAGE;
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitError(null);

    if (isGroupTab && !groupName.trim()) {
      setSubmitError(GROUP_NAME_REQUIRED_MESSAGE);
      return;
    }
    if (pickedCount === NO_HEADCOUNT) {
      setSubmitError(missingLineupMessage());
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
    setSubmitting(true);
    try {
      // A picked/typed coach is saved to the profile first; the backend
      // then resolves the entry's studio and choreographer from it.
      if (mentor) {
        try {
          await completeProfile(mentor);
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
      // A group carries its own name; one that gives only its size names
      // nobody, so the headcount is the only record of how many dance.
      const groupFields = isGroupTab
        ? { routineName: groupName.trim(), participantsCount: pickedCount }
        : {};
      const created = await createEntriesBulk(
        id,
        rows.map((r) => ({
          ...groupFields,
          participantIds: namesDancers ? effectiveParticipantIds : undefined,
          studioId: canPickCoach ? assignedStudioId || undefined : undefined,
          trainerId,
          nominationId: r.nominationId,
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
        const key = entry.nominationId;
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
          <ContestTitle
            name={competition.name}
            dateFrom={competition.dateFrom}
            dateTo={competition.dateTo}
          />
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
          <ContestTitle
            name={competition.name}
            dateFrom={competition.dateFrom}
            dateTo={competition.dateTo}
          />
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

  // A group lists its nominations once it has a size and a style (when the
  // competition has styles); everyone else once the league and a style are
  // picked.
  const showNominationRows = isGroupTab
    ? pickedCount > 0 && stylesChosen
    : hasStyles
      ? selectedStyles.length > 0
      : !!leagueId;
  const nominationsLabel =
    hasStyles ? NOMINATIONS_BY_STYLES_LABEL : NOMINATIONS_LABEL;
  // The studio and trainer show once there is a number to file under them: a
  // group is one from the start, the rest once a dancer is picked.
  const noCommonAgeCategory =
    ages.length > 0 && ageCategories.length > 0 && ageCategoryOptions.length === 0;
  const lineupChosen = isGroupTab || activeParticipants.length > 0;

  // The headcount as the form shows it: typed in, or counted from the named
  // dancers (a dash while there are none).
  const groupHeadcountText = !namesDancers
    ? headcountInput
    : effectiveParticipantIds.length > NO_HEADCOUNT
      ? String(effectiveParticipantIds.length)
      : GROUP_EMPTY_VALUE_LABEL;

  const participantPicker = (
    <ParticipantPicker
      selected={selectedParticipants}
      selfParticipant={selfParticipant}
      selfAsOption={selfAsOption}
      isCoach={isCoach}
      canPickCoach={canPickCoach}
      isStaffSubmitter={isStaffSubmitter}
      invalid={participantsInvalid}
      label={isGroupTab ? GROUP_PARTICIPANTS_LABEL : undefined}
      hint={isGroupTab ? NO_HINT : undefined}
      notice={participantLimitHit ? INDIVIDUAL_MAX_PARTICIPANTS_MESSAGE : null}
      onAdd={addParticipant}
      onRemove={removeParticipant}
    />
  );

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Заявка на конкурс</p>
        <ContestTitle
          name={competition.name}
          dateFrom={competition.dateFrom}
          dateTo={competition.dateTo}
        />
        <Link to={`/competitions/${id}`} className={styles.home}>
          ← До сторінки конкурсу
        </Link>

        {isCoach && (
          <ApplyTabs activeTab={activeTab} onChange={handleTabChange} />
        )}

        {submitError && <p className={styles.error}>{submitError}</p>}

        <div className={styles.grid}>
          {isGroupTab ? (
            <div className={styles.stack}>
              <GroupLineupFields
                name={groupName}
                nameInvalid={groupNameInvalid}
                headcount={groupHeadcountText}
                headcountEditable={!namesDancers}
                headcountInvalid={headcountInvalid}
                lineup={GROUP_LINEUP_VALUE}
                lineupDescriptions={chosenLineupValues}
                onNameChange={handleGroupNameChange}
                onHeadcountChange={handleHeadcountChange}
              />
              <div className={styles.pair}>
                <ApplyLeagueField
                  value={league}
                  options={leagueOptions}
                  invalid={leagueInvalid}
                  descriptions={chosenLeagueValues}
                  onChange={handleLeagueChange}
                />
                <ApplyAgeField
                  options={ageCategoryOptions}
                  value={chosenAgeCategory}
                  descriptions={ageDescriptionByName}
                  fallbackLabel={ageLabel}
                  noCommonCategory={noCommonAgeCategory}
                  onChange={handleAgeCategoryChange}
                />
              </div>
              <LineupModeToggle
                mode={lineupMode}
                onChange={handleLineupModeChange}
              />
              {namesDancers && <div>{participantPicker}</div>}
            </div>
          ) : (
            <div>
              {participantPicker}

              {activeParticipants.length > 0 && (
                <div className={styles.two}>
                  <ApplyLeagueField
                    value={league}
                    options={leagueOptions}
                    invalid={leagueInvalid}
                    descriptions={chosenLeagueValues}
                    onChange={handleLeagueChange}
                  />
                  <ApplyAgeField
                    options={ageCategoryOptions}
                    value={chosenAgeCategory}
                    descriptions={ageDescriptionByName}
                    fallbackLabel={ageLabel}
                    noCommonCategory={noCommonAgeCategory}
                    onChange={handleAgeCategoryChange}
                  />
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
          )}

          <div>
            {hasStyles && (
              <>
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
                  Доступні стилі з шаблону, за яким створено конкурс. Можна
                  обрати кілька — заявка буде подана в кожну номінацію.
                  Номінації, що є імпровізацією, подаються без треку.
                </p>
                <CategoryDescriptionList
                  values={chosenStyleValues}
                  className={styles.hint}
                />
              </>
            )}
            {noNominations && (
              <p className={styles.error}>
                Для цього конкурсу ще не згенеровано номінацій.
              </p>
            )}
          </div>

          {showNominationRows && (
            <div>
              <label className={styles.label}>
                {nominationsLabel}
                {isGroupTab && (
                  <>
                    {' '}
                    <span className={styles.req}>*</span>
                  </>
                )}
              </label>
              {styleRows.length === 0 ? (
                <p className={styles.hint}>
                  {rowsError ??
                    (isGroupTab
                      ? NO_GROUP_NOMINATIONS_MESSAGE
                      : ages.length === 0
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
              {isGroupTab && selectedRows.length === 0 && (
                <p className={styles.hint}>
                  {GROUP_NOMINATIONS_NONE_SELECTED_HINT}
                </p>
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

          {lineupChosen &&
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

          {lineupChosen &&
            !canPickCoach &&
            (session.profile.coachId || isStaffSubmitter ? (
              <div className={styles.two}>
                <div>
                  <label className={styles.label}>Студія</label>
                  <div className={styles.readonlyBox}>{studioLabel}</div>
                </div>
                <div>
                  <label className={styles.label}>{leaderLabel}</label>
                  <div className={styles.readonlyBox}>{coachLabel}</div>
                </div>
              </div>
            ) : (
              <div>
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
