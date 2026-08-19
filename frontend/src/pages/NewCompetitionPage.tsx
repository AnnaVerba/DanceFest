import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { getToken } from '../lib/auth';
import { CompetitionApiError, createCompetition } from '../lib/competitions';
import { createJudge } from '../lib/judges';
import type { CreatedJudge } from '../lib/judges';
import { createVenue } from '../lib/venues';
import { createNominationsBulk } from '../lib/nominations';
import NominationSetBuilder from '../components/nominations/NominationSetBuilder';
import { pluralNominations, savedSignatureOf } from '../lib/nominationSet';
import type { AxisSelection, DraftNomination } from '../lib/nominationSet';
import {
  CategoryTemplateApiError,
  createCategoryTemplate,
  getCategoryTemplate,
  getCategoryTemplates,
} from '../lib/categoryTemplates';
import type { CategoryTemplate } from '../lib/categoryTemplates';
import styles from './NewCompetitionPage.module.css';

const STEP_LABELS = [
  'Загальне',
  'Контакти',
  'Оплата',
  'Судді',
  'Категорії',
  'Майданчики',
  'Розподіл',
] as const;
const TOTAL_STEPS = STEP_LABELS.length;

let draftIdCounter = 0;
function nextDraftId(): string {
  draftIdCounter += 1;
  return `draft-${draftIdCounter}`;
}


interface DraftJudge {
  id: string;
  name: string;
  email: string;
}

// Звідки беруться номінації конкурсу: готовий шаблон чи власний набір,
// складений тут-таки. Власний завжди зберігається шаблоном — інакше наступного
// року цю саму сітку довелося б набирати заново.
type NominationSource = 'template' | 'custom';

interface DraftVenue {
  id: string;
  name: string;
  note: string;
}

export default function NewCompetitionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // Конкурс триває від одного до кількох днів, тому дві дати, а не одна.
  // Порожня dateTo означає одноденний конкурс і дорівнює dateFrom.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [registrationFrom, setRegistrationFrom] = useState('');
  const [registrationTo, setRegistrationTo] = useState('');
  const [bannerName, setBannerName] = useState<string | null>(null);

  const [contactNumber, setContactNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [paymentRecipient, setPaymentRecipient] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentBank, setPaymentBank] = useState('');
  const [paymentTaxId, setPaymentTaxId] = useState('');
  const [paymentPurpose, setPaymentPurpose] = useState('');

  const [judges, setJudges] = useState<DraftJudge[]>([]);
  const [judgeNameInput, setJudgeNameInput] = useState('');
  const [judgeEmailInput, setJudgeEmailInput] = useState('');
  const judgeNameRef = useRef<HTMLInputElement>(null);
  const judgeEmailRef = useRef<HTMLInputElement>(null);

  const [categoryTemplates, setCategoryTemplates] = useState<CategoryTemplate[] | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    searchParams.get('template') ?? '',
  );
  const [nominationSource, setNominationSource] = useState<NominationSource>('template');
  const [templateName, setTemplateName] = useState('');
  const [nominations, setNominations] = useState<DraftNomination[]>([]);
  // Крок із категоріями зникає з дерева, щойно людина йде далі. Осі тримаємо
  // тут, інакше на поверненні вони порожні, а таблиця вже повна.
  const [axes, setAxes] = useState<AxisSelection | null>(null);
  const [loadingNominations, setLoadingNominations] = useState(false);

  useEffect(() => {
    getCategoryTemplates()
      .then((templates) => {
        setCategoryTemplates(templates);
        if (!selectedTemplateId && templates.length > 0) {
          setSelectedTemplateId(templates[0].id);
        }
      })
      .catch(() => setCategoryTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Номінації копіюються з шаблону в чернетку конкурсу й далі живуть окремо:
  // правки тут не змінюють шаблон.
  useEffect(() => {
    // Порожній id буває лише до завантаження списку шаблонів, коли
    // nominations і так порожні — чистити нічого.
    if (!selectedTemplateId || nominationSource !== 'template') return;

    let cancelled = false;
    setLoadingNominations(true);
    getCategoryTemplate(selectedTemplateId)
      .then((detail) => {
        if (cancelled) return;
        setNominations(
          detail.nominations.map((n) => ({
            signature: savedSignatureOf(n),
            name: n.name,
            price: n.price === null ? '' : String(n.price),
            allowsImprovisation: n.allowsImprovisation,
            categoryIds: n.categoryIds,
            isSpecial: n.isSpecial,
            exitMode: n.exitMode,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setNominations([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingNominations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, nominationSource]);

  const patchNomination = (signature: string, patch: Partial<DraftNomination>) =>
    setNominations((prev) =>
      prev.map((n) => (n.signature === signature ? { ...n, ...patch } : n)),
    );

  const removeNomination = (signature: string) =>
    setNominations((prev) => prev.filter((n) => n.signature !== signature));

  const [venues, setVenues] = useState<DraftVenue[]>([]);
  const [venueNameInput, setVenueNameInput] = useState('');
  const [venueNoteInput, setVenueNoteInput] = useState('');
  const venueNameRef = useRef<HTMLInputElement>(null);

  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdCompetitionId, setCreatedCompetitionId] = useState<string | null>(null);
  const [createdJudges, setCreatedJudges] = useState<CreatedJudge[]>([]);

  const goStep = (n: number) => {
    setStep(Math.min(Math.max(n, 1), TOTAL_STEPS));
    window.scrollTo(0, 0);
  };

  const handleBannerPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setBannerName(file ? file.name : null);
  };

  const addJudge = () => {
    if (!judgeNameInput.trim()) {
      judgeNameRef.current?.focus();
      return;
    }
    if (!judgeEmailInput.trim()) {
      judgeEmailRef.current?.focus();
      return;
    }
    setJudges((prev) => [
      ...prev,
      { id: nextDraftId(), name: judgeNameInput.trim(), email: judgeEmailInput.trim() },
    ]);
    setJudgeNameInput('');
    setJudgeEmailInput('');
    judgeNameRef.current?.focus();
  };

  const removeJudge = (id: string) => setJudges((prev) => prev.filter((j) => j.id !== id));

  const addVenue = () => {
    if (!venueNameInput.trim()) {
      venueNameRef.current?.focus();
      return;
    }
    setVenues((prev) => [
      ...prev,
      { id: nextDraftId(), name: venueNameInput.trim(), note: venueNoteInput.trim() },
    ]);
    setVenueNameInput('');
    setVenueNoteInput('');
    venueNameRef.current?.focus();
  };

  const removeVenue = (id: string) => setVenues((prev) => prev.filter((v) => v.id !== id));

  const setAssignment = (categoryId: string, venue: string) =>
    setAssignments((prev) => ({ ...prev, [categoryId]: venue }));

  function validateRequired(): { message: string; step: number } | null {
    if (!name.trim()) return { message: 'Вкажіть назву конкурсу.', step: 1 };
    if (!dateFrom) return { message: 'Вкажіть дату початку конкурсу.', step: 1 };
    if (dateTo && dateTo < dateFrom) {
      return { message: 'Дата завершення раніша за дату початку.', step: 1 };
    }
    if (!location.trim()) return { message: 'Вкажіть місце проведення.', step: 1 };
    if (!organizer.trim()) return { message: 'Вкажіть організатора.', step: 1 };
    if (!description.trim()) return { message: 'Додайте опис конкурсу.', step: 1 };
    if (!registrationFrom || !registrationTo) {
      return { message: 'Вкажіть період реєстрації.', step: 1 };
    }
    if (nominationSource === 'custom') {
      if (!templateName.trim()) {
        return { message: 'Вкажіть назву шаблону для власного набору.', step: 5 };
      }
      if (nominations.length === 0) {
        return { message: 'Складіть набір номінацій або оберіть готовий шаблон.', step: 5 };
      }
    }
    if (!contactNumber.trim()) return { message: 'Вкажіть контактний номер.', step: 2 };
    if (!contactEmail.trim()) return { message: 'Вкажіть контактний email.', step: 2 };
    if (!paymentRecipient.trim()) return { message: 'Вкажіть отримувача платежу.', step: 3 };
    if (!paymentAccount.trim()) return { message: 'Вкажіть номер картки або IBAN.', step: 3 };
    return null;
  }

  const handlePrimaryAction = async () => {
    if (step < TOTAL_STEPS) {
      goStep(step + 1);
      return;
    }

    const validation = validateRequired();
    if (validation) {
      setSubmitError(validation.message);
      goStep(validation.step);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      // Шаблон зберігається до конкурсу навмисно: якщо збереження впаде,
      // конкурс не створиться, а складений набір лишиться на екрані. У
      // зворотному порядку людина втратила б сітку, яку набирала руками.
      if (nominationSource === 'custom') {
        await createCategoryTemplate({
          name: templateName.trim(),
          nominations: nominations.map((n, index) => ({
            name: n.name.trim(),
            price: n.price.trim() === '' ? undefined : Number(n.price),
            allowsImprovisation: n.allowsImprovisation,
            categoryIds: n.categoryIds,
            isSpecial: n.isSpecial,
            exitMode: n.exitMode,
            sortOrder: index,
          })),
        });
      }

      const competition = await createCompetition({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        organizer: organizer.trim(),
        dateFrom,
        dateTo: dateTo || dateFrom,
        registrationFrom,
        registrationTo,
        contactNumber: contactNumber.trim(),
        contactEmail: contactEmail.trim(),
        paymentRecipient: paymentRecipient.trim() || undefined,
        paymentAccount: paymentAccount.trim() || undefined,
        paymentBank: paymentBank.trim() || undefined,
        paymentTaxId: paymentTaxId.trim() || undefined,
        paymentPurpose: paymentPurpose.trim() || undefined,
      });

      const judgeResults = await Promise.allSettled(
        judges
          .filter((j) => j.email.trim())
          .map((j) => createJudge(competition.id, j.name, j.email)),
      );
      const successfulJudges = judgeResults
        .filter(
          (r): r is PromiseFulfilledResult<CreatedJudge> => r.status === 'fulfilled',
        )
        .map((r) => r.value);

      await Promise.allSettled([
        ...venues
          .filter((v) => v.name.trim())
          .map((v) => createVenue(competition.id, v.name.trim(), v.note.trim())),
        // Один запит на весь набір замість запиту на кожну номінацію.
        ...(nominations.length > 0
          ? [
              createNominationsBulk(
                competition.id,
                nominations.map((n) => ({
                  name: n.name,
                  price: n.price.trim() === '' ? undefined : Number(n.price),
                  allowsImprovisation: n.allowsImprovisation,
                  categoryIds: n.categoryIds,
                  isSpecial: n.isSpecial,
                  exitMode: n.exitMode,
                })),
              ),
            ]
          : []),
      ]);

      if (successfulJudges.length > 0) {
        setCreatedJudges(successfulJudges);
        setCreatedCompetitionId(competition.id);
      } else {
        navigate(`/competitions/${competition.id}`);
      }
    } catch (err) {
      // Помилка шаблону приходить своїм класом і має інший текст: конкурсу ще
      // немає, і казати «не вдалося створити конкурс» було б брехнею.
      if (err instanceof CategoryTemplateApiError) {
        setSubmitError(`Не вдалося зберегти шаблон: ${err.message}`);
        goStep(5);
      } else {
        setSubmitError(
          err instanceof CompetitionApiError
            ? err.message
            : 'Не вдалося створити конкурс. Спробуйте ще раз.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 1) goStep(step - 1);
  };

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  if (createdCompetitionId) {
    return (
      <>
        <AdminHeader />
        <main className={styles.main}>
          <div className={styles.wrap}>
            <h1>Конкурс створено</h1>
            <div className={styles.panel}>
              <p className={styles.sectionTitle}>Паролі суддів</p>
              <p className={styles.sectionNote}>
                Кожен тимчасовий пароль показується лише один раз — перекажіть його
                судді зараз, повторно він ніде не відображається.
              </p>
              <div className={styles.list}>
                {createdJudges.map((j) => (
                  <div className={styles.item} key={j.id}>
                    <div>
                      <h3>{j.name}</h3>
                      <p className={styles.sub}>{j.email}</p>
                    </div>
                    <div className={styles.spacer} />
                    <span className={`${styles.badge} ${styles.badgeOk}`}>
                      {j.tempPassword}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.actions}>
              <div className={styles.spacer} />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => navigate(`/competitions/${createdCompetitionId}`)}
              >
                Перейти до конкурсу
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className={styles.main}>
        <div className={styles.wrap}>
          <Link to="/dashboard" className={styles.back}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Назад до списку
          </Link>
          <h1>Новий конкурс</h1>

          <div className={styles.steps} role="tablist" aria-label="Кроки створення конкурсу">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const cls = [
                styles.step,
                n === step ? styles.stepCurrent : '',
                n < step ? styles.stepDone : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={n === step}
                  className={cls}
                  onClick={() => goStep(n)}
                >
                  <span className={styles.dot}>{n}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {submitError && <p className={styles.error}>{submitError}</p>}

          {step === 1 && (
            <div className={styles.panel}>
              <p className={styles.sectionTitle} style={{ marginBottom: 18 }}>
                Основна інформація
              </p>
              <div className={styles.field}>
                <label htmlFor="w-name">Банер конкурсу</label>
                <button
                  type="button"
                  className={styles.dropzone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  {bannerName ?? 'Перетягніть банер конкурсу'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerPick}
                  style={{ display: 'none' }}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="w-name">
                  Назва конкурсу <span className={styles.req}>*</span>
                </label>
                <input
                  id="w-name"
                  type="text"
                  placeholder='Кубок «Східна ніч» 2026'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="w-desc">Опис конкурсу</label>
                <textarea
                  id="w-desc"
                  placeholder="Короткий опис конкурсу для учасників"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="w-date-from">
                    Дата початку <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="w-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="w-date-to">Дата завершення</label>
                  <input
                    id="w-date-to"
                    type="date"
                    min={dateFrom || undefined}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                  <p className={styles.hint}>
                    Залиште порожнім, якщо конкурс на один день.
                  </p>
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="w-place">
                  Місце проведення <span className={styles.req}>*</span>
                </label>
                <input
                  id="w-place"
                  className={styles.half}
                  type="text"
                  placeholder="м. Львів, Палац культури"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="w-org">
                  Організатор <span className={styles.req}>*</span>
                </label>
                <input
                  id="w-org"
                  className={styles.half}
                  type="text"
                  placeholder='Студія східного танцю «Джерело»'
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="w-from">Реєстрація з</label>
                  <input
                    id="w-from"
                    type="date"
                    value={registrationFrom}
                    onChange={(e) => setRegistrationFrom(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="w-to">Реєстрація до</label>
                  <input
                    id="w-to"
                    type="date"
                    value={registrationTo}
                    onChange={(e) => setRegistrationTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.panel}>
              <p className={styles.sectionTitle} style={{ marginBottom: 18 }}>
                Контакти
              </p>
              <div className={styles.row}>
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label htmlFor="w-phone">
                    Контактний номер <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="w-phone"
                    type="tel"
                    placeholder="+380 67 123 45 67"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label htmlFor="w-email">
                    Контактний email <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="w-email"
                    type="email"
                    placeholder="contest@studio.ua"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.panel}>
              <p className={styles.sectionTitle}>Реквізити для оплати</p>
              <p className={styles.sectionNote}>
                Оплата участі приймається лише переказом за реквізитами — оплата через
                застосунок не проводиться.
              </p>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="w-recip">
                    Отримувач <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="w-recip"
                    type="text"
                    placeholder="ФОП Ковальчук О. М."
                    value={paymentRecipient}
                    onChange={(e) => setPaymentRecipient(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="w-iban">
                    Номер картки / IBAN <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="w-iban"
                    type="text"
                    placeholder="UA12 3456 7800 0002 6007 2335 6600 1"
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.row3} style={{ marginBottom: 0 }}>
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label htmlFor="w-bank">Банк</label>
                  <input
                    id="w-bank"
                    type="text"
                    placeholder="АТ КБ «ПриватБанк»"
                    value={paymentBank}
                    onChange={(e) => setPaymentBank(e.target.value)}
                  />
                </div>
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label htmlFor="w-edrpou">ЄДРПОУ / ІПН</label>
                  <input
                    id="w-edrpou"
                    type="text"
                    placeholder="3214567890"
                    value={paymentTaxId}
                    onChange={(e) => setPaymentTaxId(e.target.value)}
                  />
                </div>
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label htmlFor="w-purpose">Призначення платежу</label>
                  <input
                    id="w-purpose"
                    type="text"
                    placeholder="Внесок за участь"
                    value={paymentPurpose}
                    onChange={(e) => setPaymentPurpose(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.panel}>
              <p className={styles.sectionTitle}>Судді</p>
              <p className={styles.sectionNote}>
                Кожен суддя отримає тимчасовий пароль на email і матиме доступ лише до цього
                конкурсу.
              </p>
              {judges.length > 0 && (
                <div className={styles.list} style={{ marginBottom: 16 }}>
                  {judges.map((j) => (
                    <div className={styles.item} key={j.id}>
                      <div>
                        <h3>{j.name}</h3>
                        <p className={styles.sub}>{j.email}</p>
                      </div>
                      <div className={styles.spacer} />
                      <span className={`${styles.badge} ${styles.badgeWarn}`}>
                        Пароль не надіслано
                      </span>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                        aria-label="Прибрати суддю"
                        onClick={() => removeJudge(j.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.inlineAdd}>
                <input
                  ref={judgeNameRef}
                  type="text"
                  placeholder="Ім'я судді"
                  aria-label="Ім'я судді"
                  value={judgeNameInput}
                  onChange={(e) => setJudgeNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addJudge()}
                />
                <input
                  ref={judgeEmailRef}
                  type="email"
                  placeholder="email судді"
                  aria-label="Email судді"
                  value={judgeEmailInput}
                  onChange={(e) => setJudgeEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addJudge()}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={addJudge}
                >
                  Додати
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className={styles.panel}>
              <p className={styles.sectionTitle} style={{ marginBottom: 16 }}>
                Номінації конкурсу
              </p>
              <p className={styles.sectionNote}>
                Номінації копіюються в цей конкурс. Далі їх можна правити тут —
                на сам шаблон це не вплине.
              </p>

              <div
                className={styles.sourceSwitch}
                role="group"
                aria-label="Звідки взяти номінації"
              >
                <button
                  type="button"
                  className={styles.sourceOption}
                  aria-pressed={nominationSource === 'template'}
                  onClick={() => setNominationSource('template')}
                >
                  <strong>Обрати готовий шаблон</strong>
                  <em>набір із ваших або публічних шаблонів</em>
                </button>
                <button
                  type="button"
                  className={styles.sourceOption}
                  aria-pressed={nominationSource === 'custom'}
                  onClick={() => {
                    setNominationSource('custom');
                    // Набір із шаблону не переносимо: людина обрала складати
                    // свій, і чужі рядки в таблиці її тільки заплутають.
                    setNominations([]);
                  }}
                >
                  <strong>Скласти власний</strong>
                  <em>набрати осі тут і зберегти як новий шаблон</em>
                </button>
              </div>

              {nominationSource === 'custom' && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="w-tpl-name">
                      Назва шаблону <span className={styles.req}>*</span>
                    </label>
                    <input
                      id="w-tpl-name"
                      type="text"
                      placeholder="Східний танець — стандарт"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                    <p className={styles.hint}>
                      Набір збережеться шаблоном, щоб наступного року не набирати
                      його заново.
                    </p>
                  </div>

                  <NominationSetBuilder
                    nominations={nominations}
                    onChange={setNominations}
                    selection={axes}
                    onSelectionChange={setAxes}
                  />
                </>
              )}

              {nominationSource === 'template' && (
              <div className={styles.field}>
                <label htmlFor="w-tpl">Шаблон номінацій</label>
                {categoryTemplates === null ? (
                  <p className={styles.hint}>Завантаження шаблонів...</p>
                ) : categoryTemplates.length === 0 ? (
                  <p className={styles.hint}>
                    Шаблонів ще немає.{' '}
                    <Link to="/category-templates/new">Створіть перший</Link>.
                  </p>
                ) : (
                  <select
                    id="w-tpl"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    {categoryTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.nominationsCount})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              )}

              {nominationSource === 'template' && loadingNominations ? (
                <p className={styles.hint}>Завантаження номінацій...</p>
              ) : nominationSource === 'template' && nominations.length === 0 ? (
                <p className={styles.empty}>
                  У цьому шаблоні немає номінацій — оберіть інший.
                </p>
              ) : nominationSource === 'custom' ? null : (
                <>
                  <p className={styles.hint}>
                    Буде створено {nominations.length}{' '}
                    {pluralNominations(nominations.length)}.
                  </p>
                  <div className={styles.nomTableScroll}>
                    <table className={styles.nomTable}>
                      <thead>
                        <tr>
                          <th>Назва</th>
                          <th className={styles.nomColPrice}>Ціна, грн</th>
                          <th className={styles.nomColImprov}>Імпровізація</th>
                          <th className={styles.nomColRemove} aria-label="Прибрати" />
                        </tr>
                      </thead>
                      <tbody>
                        {nominations.map((n) => (
                          <tr key={n.signature}>
                            <td>
                              <input
                                type="text"
                                aria-label="Назва номінації"
                                value={n.name}
                                onChange={(e) =>
                                  patchNomination(n.signature, { name: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                placeholder="—"
                                aria-label={`Ціна номінації «${n.name}»`}
                                value={n.price}
                                onChange={(e) =>
                                  patchNomination(n.signature, { price: e.target.value })
                                }
                              />
                            </td>
                            <td className={styles.nomImprovCell}>
                              <input
                                type="checkbox"
                                aria-label={`Дозволити імпровізацію в «${n.name}»`}
                                checked={n.allowsImprovisation}
                                onChange={(e) =>
                                  patchNomination(n.signature, {
                                    allowsImprovisation: e.target.checked,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                                aria-label={`Прибрати «${n.name}»`}
                                onClick={() => removeNomination(n.signature)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 6 && (
            <div className={styles.panel}>
              <p className={styles.sectionTitle}>Майданчики</p>
              <p className={styles.sectionNote}>
                Кожен майданчик має свою окрему групу суддів. Номінації нижче можна розподілити
                по майданчиках.
              </p>
              {venues.length > 0 && (
                <div className={styles.list} style={{ marginBottom: 16 }}>
                  {venues.map((v) => (
                    <div className={styles.item} key={v.id}>
                      <div>
                        <h3>{v.name}</h3>
                        {v.note && <p className={styles.sub}>{v.note}</p>}
                      </div>
                      <div className={styles.spacer} />
                      <span className={`${styles.badge} ${styles.badgeMuted}`}>
                        Суддів не призначено
                      </span>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                        aria-label="Видалити майданчик"
                        onClick={() => removeVenue(v.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.inlineAdd}>
                <input
                  ref={venueNameRef}
                  type="text"
                  placeholder="Назва майданчика (напр. Сцена А)"
                  aria-label="Назва майданчика"
                  value={venueNameInput}
                  onChange={(e) => setVenueNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addVenue()}
                />
                <input
                  type="text"
                  placeholder="Опис / коментар"
                  aria-label="Опис майданчика"
                  value={venueNoteInput}
                  onChange={(e) => setVenueNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addVenue()}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={addVenue}
                >
                  Додати майданчик
                </button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className={styles.panel}>
              <p className={styles.sectionTitle} style={{ marginBottom: 18 }}>
                Розподіл номінацій по майданчикам
              </p>
              {nominations.length === 0 ? (
                <p className={styles.empty}>
                  Ще не сформовано номінацій — поверніться до кроку «
                  <button
                    type="button"
                    className={styles.linkAccent}
                    onClick={() => goStep(5)}
                  >
                    Категорії
                  </button>
                  ».
                </p>
              ) : venues.length === 0 ? (
                <p className={styles.empty}>
                  Немає майданчиків — додайте їх на кроці «
                  <button
                    type="button"
                    className={styles.linkAccent}
                    onClick={() => goStep(6)}
                  >
                    Майданчики
                  </button>
                  ».
                </p>
              ) : (
                <div className={styles.list}>
                  {nominations.map((n) => (
                    <div className={styles.item} key={n.signature}>
                      <div style={{ flex: 1 }}>
                        <h3>{n.name}</h3>
                      </div>
                      <div style={{ width: 200 }}>
                        <select
                          aria-label="Майданчик для номінації"
                          value={assignments[n.signature] ?? venues[0]?.name ?? ''}
                          onChange={(e) => setAssignment(n.signature, e.target.value)}
                        >
                          {venues.map((v) => (
                            <option key={v.id} value={v.name}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.actions}>
            {step === 1 ? (
              <Link to="/dashboard" className={styles.btn}>
                Скасувати
              </Link>
            ) : (
              <button type="button" className={styles.btn} onClick={handleBack}>
                Назад
              </button>
            )}
            <div className={styles.spacer} />
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handlePrimaryAction}
              disabled={submitting}
            >
              {submitting
                ? 'Створення...'
                : step === TOTAL_STEPS
                  ? 'Створити конкурс'
                  : 'Далі'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
