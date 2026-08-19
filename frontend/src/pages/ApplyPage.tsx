import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { getNominations } from '../lib/nominations';
import type { Nomination } from '../lib/nominations';
import { RegistrationApiError, createRegistration } from '../lib/registrations';
import styles from './ApplyPage.module.css';

let draftIdCounter = 0;
function nextDraftId(): string {
  draftIdCounter += 1;
  return `participant-${draftIdCounter}`;
}

interface DraftParticipant {
  id: string;
  name: string;
}

function emptyParticipant(): DraftParticipant {
  return { id: nextDraftId(), name: '' };
}

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [nominations, setNominations] = useState<Nomination[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const nominationRef = useRef<HTMLSelectElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const participantRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [title, setTitle] = useState('');
  const [nominationIndex, setNominationIndex] = useState('');
  const [improv, setImprov] = useState(false);
  const [studio, setStudio] = useState('');
  const [choreographer, setChoreographer] = useState('');
  const [coachName, setCoachName] = useState('');
  const [city, setCity] = useState('');
  const [participants, setParticipants] = useState<DraftParticipant[]>([emptyParticipant()]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const selectedNomination =
    nominationIndex === '' || !nominations ? null : nominations[Number(nominationIndex)];

  const handleImprovChange = (checked: boolean) => {
    setImprov(checked);
    if (checked && musicInputRef.current) {
      musicInputRef.current.value = '';
    }
  };

  const updateParticipantName = (participantId: string, name: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === participantId ? { ...p, name } : p)));
    setParticipantsError(null);
  };

  const addParticipant = () => {
    const draft = emptyParticipant();
    setParticipants((prev) => [...prev, draft]);
    setTimeout(() => participantRefs.current[draft.id]?.focus(), 0);
  };

  const removeParticipant = (participantId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSuccessMessage(null);
    setSubmitError(null);
    setParticipantsError(null);
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    if (nominationIndex === '' || !selectedNomination) {
      nominationRef.current?.focus();
      return;
    }
    const namedParticipants = participants.filter((p) => p.name.trim());
    if (namedParticipants.length === 0) {
      setParticipantsError("Вкажіть ім'я хоча б одного учасника.");
      return;
    }

    setSubmitting(true);
    try {
      await createRegistration(id, {
        nominationId: selectedNomination.id,
        routineName: title.trim(),
        coach: coachName.trim() ? { name: coachName.trim() } : undefined,
        studioName: studio.trim() || undefined,
        choreographer: choreographer.trim() || undefined,
        city: city.trim() || undefined,
        improv,
        participants: namedParticipants.map((p) => ({ name: p.name.trim() })),
      });
      setSuccessMessage('Заявку надіслано.');
      setTitle('');
      setNominationIndex('');
      setStudio('');
      setChoreographer('');
      setCoachName('');
      setCity('');
      setParticipants([emptyParticipant()]);
      setImprov(false);
    } catch (err) {
      setSubmitError(
        err instanceof RegistrationApiError
          ? err.message
          : 'Не вдалося надіслати заявку. Спробуйте ще раз.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Заявка на конкурс</p>
          <h1>Оберіть конкурс</h1>
          <p>
            Ця сторінка призначена для подання заявки на конкретний конкурс — перейдіть за
            посиланням «Форма подачі заявки» зі сторінки потрібного конкурсу.
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

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Заявка на конкурс</p>
        <h1>{competition.name}</h1>
        <Link to={`/competitions/${id}`} className={styles.home}>
          ← До сторінки конкурсу
        </Link>

        {successMessage && <p className={styles.success}>{successMessage}</p>}
        {submitError && <p className={styles.error}>{submitError}</p>}

        <div className={styles.field}>
          <label htmlFor="f-title">
            Назва номеру <span className={styles.req}>*</span>
          </label>
          <input
            ref={titleRef}
            id="f-title"
            type="text"
            placeholder="Beautiful Life"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.field} style={{ marginBottom: 14 }}>
          <label htmlFor="f-nom">
            Номінація <span className={styles.req}>*</span>
          </label>
          <select
            ref={nominationRef}
            id="f-nom"
            value={nominationIndex}
            disabled={nominations.length === 0}
            onChange={(e) => {
              setNominationIndex(e.target.value);
              const next =
                e.target.value === '' ? null : nominations[Number(e.target.value)];
              if (!next?.allowsImprovisation) handleImprovChange(false);
            }}
          >
            <option value="">Оберіть номінацію...</option>
            {nominations.map((n, i) => (
              <option key={n.id} value={i}>
                {n.name}
              </option>
            ))}
          </select>
          {nominations.length === 0 && (
            <p className={styles.error}>
              Для цього конкурсу ще не згенеровано номінацій.
            </p>
          )}
        </div>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={improv}
            disabled={!selectedNomination?.allowsImprovisation}
            onChange={(e) => handleImprovChange(e.target.checked)}
          />
          Імпровізація
          {selectedNomination && !selectedNomination.allowsImprovisation && (
            <span className={styles.hint}> — недоступна в цій номінації</span>
          )}
        </label>

        <div className={styles.field}>
          <label>
            Учасники <span className={styles.req}>*</span>
          </label>
          {participants.map((p, i) => (
            <div key={p.id} className={styles.participantRow}>
              <input
                ref={(el) => {
                  participantRefs.current[p.id] = el;
                }}
                type="text"
                placeholder={`Учасник ${i + 1}`}
                aria-label={`Ім'я учасника ${i + 1}`}
                value={p.name}
                onChange={(e) => updateParticipantName(p.id, e.target.value)}
              />
              {participants.length > 1 && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`Прибрати учасника ${i + 1}`}
                  onClick={() => removeParticipant(p.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={addParticipant}>
            + Додати учасника
          </button>
          {participantsError && <p className={styles.error}>{participantsError}</p>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="f-studio">Студія</label>
            <input
              id="f-studio"
              type="text"
              placeholder="StarFamily"
              value={studio}
              onChange={(e) => setStudio(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="f-choreo">Хореограф (необов'язково)</label>
            <input
              id="f-choreo"
              type="text"
              placeholder="Анна Луцкевич"
              value={choreographer}
              onChange={(e) => setChoreographer(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="f-coach">Тренер (необов'язково)</label>
            <input
              id="f-coach"
              type="text"
              placeholder="Олена Тренер"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="f-city">Місто</label>
            <input
              id="f-city"
              type="text"
              placeholder="Львів"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="f-price">Ціна за номінацію</label>
          <input
            id="f-price"
            type="text"
            readOnly
            value={selectedNomination?.price ? `${selectedNomination.price} грн` : '—'}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="f-music">Музика для виступу</label>
          <input
            ref={musicInputRef}
            id="f-music"
            type="file"
            accept="audio/*"
            disabled={improv}
          />
        </div>

        <button
          type="button"
          className={styles.submit}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Надсилання...' : 'Надіслати заявку'}
        </button>
      </div>
    </main>
  );
}
