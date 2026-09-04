import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { getNominations } from '../lib/nominations';
import type { Nomination, NominationAgeCategory } from '../lib/nominations';
import { EntryApiError, createEntriesBulk } from '../lib/entries';
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
import { getSession } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import styles from './ApplyPage.module.css';

type PayMethod = 'cash' | 'card';

interface NominationRow {
  key: string;
  nominationId: string;
  improv: boolean;
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

// Mirrors the server's resolveLineup: Соло / Дуо / Тріо / Група by count.
function lineupLabel(count: number): string {
  if (count >= 4) return 'Група';
  if (count === 3) return 'Тріо';
  if (count === 2) return 'Дуо';
  return 'Соло';
}

// Does a nomination's line-up category fit the number of picked dancers?
// Соло — 1, Дует/Дуо — 2, Тріо — 3, Група/Формейшн — 3+.
function lineupMatches(categoryName: string, count: number): boolean {
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

function ageFromBirthDate(birthDate: string): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

function matchAgeCategory(
  age: number,
  categories: NominationAgeCategory[],
): string | null {
  const hit = categories.find((c) => {
    if (c.ageFrom === null && c.ageTo === null) return false;
    const from = c.ageFrom ?? Number.NEGATIVE_INFINITY;
    const to = c.ageTo ?? Number.POSITIVE_INFINITY;
    return age >= from && age <= to;
  });
  return hit ? hit.name : null;
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function priceLabel(price: number | null): string {
  return price ? `${price} грн` : '—';
}

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Read once: the session only changes on login/logout, which unmounts
  // this page anyway.
  const session = useMemo(() => getSession(), []);

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [nominations, setNominations] = useState<Nomination[] | null>(null);
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
  const [league, setLeague] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [musicByKey, setMusicByKey] = useState<Record<string, string>>({});

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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const isCoach = session
    ? meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.COACH)
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
    Promise.all([getCompetition(id), getNominations(id)])
      .then(([c, noms]) => {
        if (cancelled) return;
        setCompetition(c);
        setNominations(noms);
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

  const activeParticipants = selfParticipant
    ? [selfParticipant]
    : selectedParticipants;

  const nonSpecial = useMemo(
    () => (nominations ?? []).filter((n) => !n.isSpecial),
    [nominations],
  );
  const specials = useMemo(
    () => (nominations ?? []).filter((n) => n.isSpecial),
    [nominations],
  );

  const leagueOptions = useMemo(
    () => uniqueInOrder((nominations ?? []).flatMap((n) => n.leagues)),
    [nominations],
  );

  const styleOptions = useMemo(
    () => uniqueInOrder(nonSpecial.flatMap((n) => n.programs.map((p) => p.name))),
    [nonSpecial],
  );

  const ageCategories = useMemo(
    () => nonSpecial.flatMap((n) => n.ageCategories),
    [nonSpecial],
  );

  const pickedCount = selfParticipant ? 1 : selectedParticipants.length;

  const styleRows: NominationRow[] = useMemo(() => {
    const rows: NominationRow[] = [];
    for (const n of nonSpecial) {
      const matchesStyle = n.programs.some((p) =>
        selectedStyles.includes(p.name),
      );
      const matchesLeague = !league || n.leagues.includes(league);
      // Once more than one dancer is picked, hide the solo nominations (and
      // vice-versa) — the line-up is fixed by the count.
      const matchesLineup =
        n.lineups.length === 0 ||
        n.lineups.some((l) => lineupMatches(l, pickedCount));
      if (!matchesStyle || !matchesLeague || !matchesLineup) continue;
      rows.push({
        key: n.id,
        nominationId: n.id,
        improv: false,
        label: n.name,
        price: n.price,
      });
      if (n.allowsImprovisation) {
        rows.push({
          key: `${n.id}:improv`,
          nominationId: n.id,
          improv: true,
          label: `${n.name} · Імпровізація`,
          price: n.price,
        });
      }
    }
    return rows;
  }, [nonSpecial, selectedStyles, league, pickedCount]);

  const specialRows: NominationRow[] = useMemo(
    () =>
      specials.map((n) => ({
        key: n.id,
        nominationId: n.id,
        improv: false,
        label: n.name,
        price: n.price,
      })),
    [specials],
  );

  const allRows = useMemo(
    () => [...styleRows, ...specialRows],
    [styleRows, specialRows],
  );

  const selectedRows = allRows.filter((r) => selectedKeys.includes(r.key));
  const total = selectedRows.reduce((sum, r) => sum + (r.price ?? 0), 0);

  const ageLabel = (() => {
    if (activeParticipants.length === 0) return '—';
    if (activeParticipants.length > 1) {
      return `Груповий номер · ${activeParticipants.length} учасників`;
    }
    const age = ageFromBirthDate(activeParticipants[0].birthDate);
    if (age === null) return '—';
    const category = matchAgeCategory(age, ageCategories);
    return category ? `${age} р. · ${category}` : `${age} р.`;
  })();

  const coachLabel =
    session && isCoach ? fullName(session.profile) : '—';

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
    const name = e.target.files?.[0]?.name ?? '';
    setMusicByKey((prev) => ({ ...prev, [key]: name }));
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
    setSelectedStyles([]);
    setSelectedKeys([]);
    setCity('');
    setPayMethod('card');
    setMusicByKey({});
    setCreatedCount(0);
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

    setSubmitting(true);
    try {
      const created = await createEntriesBulk(
        id,
        rows.map((r) => ({
          participantIds: effectiveParticipantIds,
          nominationId: r.nominationId,
          improv: r.improv,
          city: city.trim() || undefined,
          paymentMethod: payMethod,
          musicName: musicByKey[r.key] || undefined,
        })),
      );
      setCreatedCount(created.length);
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

  if (!competition || !nominations) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>Завантаження...</div>
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

  const noNominations = nominations.length === 0;

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
                  className={styles.textInput}
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
                    className={styles.select}
                    value={league}
                    onChange={(e) => {
                      setLeague(e.target.value);
                      setSelectedKeys([]);
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
                </div>
                <div>
                  <label className={styles.label}>Вік / вікова категорія</label>
                  <div className={styles.readonlyBox}>{ageLabel}</div>
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
              </div>
            )}
          </div>

          <div>
            <label className={styles.label}>
              Стилі <span className={styles.req}>*</span>
            </label>
            <div className={styles.chips}>
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
                  Немає номінацій для цього поєднання ліги та стилів.
                </p>
              ) : (
                <div className={styles.nomList}>
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
                          {priceLabel(row.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {specialRows.length > 0 && (
            <div>
              <label className={styles.label}>Спеціальні номінації</label>
              <div className={styles.nomList}>
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
                        {priceLabel(row.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className={styles.hint}>
                Номінації поза сіткою категорій — наприклад «Гран-прі конкурсу».
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

          {activeParticipants.length > 0 && (
            <div className={styles.two}>
              <div>
                <label className={styles.label}>Студія</label>
                <div className={styles.readonlyBox}>{studioLabel}</div>
              </div>
              <div>
                <label className={styles.label}>Тренер</label>
                <div className={styles.readonlyBox}>{coachLabel}</div>
              </div>
            </div>
          )}

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
                {total ? `${total} грн` : '—'}
              </div>
            </div>
          </div>

          {selectedRows.length > 0 && (
            <div>
              <label className={styles.label}>Музика для виступів</label>
              <div className={styles.musicList}>
                {selectedRows.map((row) => (
                  <div key={row.key} className={styles.musicRow}>
                    <span className={styles.musicLabel}>{row.label}</span>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setMusicForRow(row.key, e)}
                    />
                    {musicByKey[row.key] && (
                      <span className={styles.hint}>
                        Обрано: {musicByKey[row.key]}
                      </span>
                    )}
                  </div>
                ))}
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
