import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import PhoneField from '../components/PhoneField';
import PublicTopBar from '../components/PublicTopBar';
import { getSession, getToken } from '../lib/auth';
import type { CoachProfile } from '../lib/auth';
import { getCompetitionStatus, getCompetitions } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { COMPETITION_STATUS } from '../lib/competitionStatus';
import {
  ParticipantApiError,
  createParticipant,
  getMyParticipants,
} from '../lib/participants';
import type { ParticipantSummary } from '../lib/participants';
import { MIN_PASSWORD_LENGTH } from '../lib/auth.constants';
import { ROLE, ROLE_CABINET_PATH } from '../lib/roles';
import styles from './CoachCabinetPage.module.css';

const COACH_TAB = {
  COMPETITIONS: 'competitions',
  PARTICIPANTS: 'participants',
} as const;
type CoachTab = (typeof COACH_TAB)[keyof typeof COACH_TAB];

const COACH_TABS: { id: CoachTab; label: string }[] = [
  { id: COACH_TAB.COMPETITIONS, label: 'Конкурси' },
  { id: COACH_TAB.PARTICIPANTS, label: 'Мої учасники' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CoachCabinetPage() {
  const session = getSession();

  const [tab, setTab] = useState<CoachTab>(COACH_TAB.COMPETITIONS);

  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [competitionsError, setCompetitionsError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<ParticipantSummary[] | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCompetitions()
      .then((data) => {
        if (!cancelled) setCompetitions(data);
      })
      .catch(() => {
        if (!cancelled) setCompetitionsError('Не вдалося завантажити конкурси.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyParticipants()
      .then((data) => {
        if (!cancelled) setParticipants(data);
      })
      .catch(() => {
        if (!cancelled) setParticipantsError('Не вдалося завантажити учасників.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCompetitions = useMemo(
    () =>
      (competitions ?? []).filter(
        (c) => getCompetitionStatus(c) === COMPETITION_STATUS.REGISTRATION_OPEN,
      ),
    [competitions],
  );

  const handleAddParticipant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`);
      return;
    }

    setSubmitting(true);
    try {
      const created = await createParticipant({
        firstName,
        lastName,
        phone,
        email,
        password,
        birthDate,
      });
      setParticipants((prev) => (prev ? [...prev, created] : [created]));
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setBirthDate('');
    } catch (err) {
      setFormError(
        err instanceof ParticipantApiError ? err.message : 'Не вдалося додати учасника.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }
  if (session.role !== ROLE.COACH) {
    return <Navigate to={ROLE_CABINET_PATH[session.role]} replace />;
  }

  const profile = session.profile as CoachProfile;

  return (
    <>
      <PublicTopBar />
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Кабінет тренера</p>
          <h1 className={styles.title}>
            {profile.firstName} {profile.lastName}
          </h1>

          <div className={styles.tabs} role="tablist" aria-label="Розділи кабінету">
            {COACH_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === COACH_TAB.COMPETITIONS && (
            <section className={styles.section}>
              {competitionsError && <p className={styles.status}>{competitionsError}</p>}
              {!competitionsError && competitions === null && (
                <p className={styles.status}>Завантаження...</p>
              )}
              {!competitionsError && competitions !== null && openCompetitions.length === 0 && (
                <p className={styles.status}>
                  Зараз немає конкурсів з відкритою реєстрацією.
                </p>
              )}
              <ul className={styles.list}>
                {openCompetitions.map((c) => (
                  <li key={c.id} className={styles.card}>
                    <div>
                      <div className={styles.cardName}>{c.name}</div>
                      <div className={styles.cardMeta}>
                        {formatDate(c.dateFrom)}
                        {c.location && ` · ${c.location}`}
                      </div>
                    </div>
                    <Link to={`/competitions/${c.id}/apply`} className={styles.applyBtn}>
                      Подати заявку
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab === COACH_TAB.PARTICIPANTS && (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Новий учасник</h2>
                {formError && <p className={styles.formError}>{formError}</p>}
                <form className={styles.form} autoComplete="off" onSubmit={handleAddParticipant}>
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label htmlFor="p-firstName">Ім'я</label>
                      <input
                        id="p-firstName"
                        type="text"
                        autoComplete="off"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="p-lastName">Прізвище</label>
                      <input
                        id="p-lastName"
                        type="text"
                        autoComplete="off"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label htmlFor="p-phone">Телефон</label>
                      <PhoneField id="p-phone" value={phone} onChange={setPhone} />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="p-email">Email</label>
                      <input
                        id="p-email"
                        type="email"
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label htmlFor="p-birthDate">Дата народження</label>
                      <input
                        id="p-birthDate"
                        type="date"
                        autoComplete="off"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="p-password">
                        Пароль для входу учасника
                      </label>
                      <input
                        id="p-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    {submitting ? 'Додавання...' : 'Додати учасника'}
                  </button>
                </form>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Мої учасники</h2>
                {participantsError && <p className={styles.status}>{participantsError}</p>}
                {!participantsError && participants === null && (
                  <p className={styles.status}>Завантаження...</p>
                )}
                {!participantsError && participants !== null && participants.length === 0 && (
                  <p className={styles.status}>Ви ще не додали жодного учасника.</p>
                )}
                {participants && participants.length > 0 && (
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Учасник</th>
                          <th scope="col">Дата нар.</th>
                          <th scope="col">Телефон</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((p) => (
                          <tr key={p.id}>
                            <td>
                              {p.firstName} {p.lastName}
                            </td>
                            <td>{formatDate(p.birthDate)}</td>
                            <td>{p.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
