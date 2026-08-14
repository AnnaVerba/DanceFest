import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { getToken } from '../lib/auth';
import { CompetitionApiError, getCompetition, updateCompetition } from '../lib/competitions';
import type { CompetitionInput } from '../lib/competitions';
import styles from './CompetitionFormPage.module.css';

const EMPTY_FORM: CompetitionInput = {
  image: '',
  name: '',
  description: '',
  location: '',
  organizer: '',
  dateFrom: '',
  dateTo: '',
  registrationFrom: '',
  registrationTo: '',
  contactNumber: '',
  contactEmail: '',
  paymentRecipient: '',
  paymentAccount: '',
  paymentBank: '',
  paymentTaxId: '',
  paymentPurpose: '',
};

function toPayload(form: CompetitionInput): CompetitionInput {
  const payload: CompetitionInput = { ...form };
  (Object.keys(payload) as (keyof CompetitionInput)[]).forEach((key) => {
    if (payload[key] === '') delete payload[key];
  });
  return payload;
}

export default function CompetitionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<CompetitionInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getCompetition(id)
      .then((c) => {
        if (cancelled) return;
        setForm({
          image: c.image ?? '',
          name: c.name,
          description: c.description,
          location: c.location,
          organizer: c.organizer,
          dateFrom: c.dateFrom,
          dateTo: c.dateTo,
          registrationFrom: c.registrationFrom,
          registrationTo: c.registrationTo,
          contactNumber: c.contactNumber,
          contactEmail: c.contactEmail,
          paymentRecipient: c.paymentRecipient ?? '',
          paymentAccount: c.paymentAccount ?? '',
          paymentBank: c.paymentBank ?? '',
          paymentTaxId: c.paymentTaxId ?? '',
          paymentPurpose: c.paymentPurpose ?? '',
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити конкурс.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update =
    (key: keyof CompetitionInput) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const saved = await updateCompetition(id, toPayload(form));
      navigate(`/competitions/${saved.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof CompetitionApiError
          ? err.message
          : 'Не вдалося зберегти конкурс. Спробуйте ще раз.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!id) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <AdminHeader />
      <main className={styles.main}>
        <div className={styles.wrap}>
          <Link to={`/competitions/${id}`} className={styles.back}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Назад до конкурсу
          </Link>

          <h1 className={styles.title}>Редагувати конкурс</h1>

          {loading && <p className={styles.status}>Завантаження...</p>}
          {loadError && <p className={styles.status}>{loadError}</p>}

          {!loading && !loadError && (
            <form className={styles.card} onSubmit={handleSubmit}>
              {submitError && <p className={styles.error}>{submitError}</p>}

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Основне</h2>
                <div className={styles.field}>
                  <label htmlFor="name">Назва конкурсу</label>
                  <input
                    id="name"
                    required
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Зірки Танцполу 2026"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="description">Опис</label>
                  <textarea
                    id="description"
                    required
                    rows={4}
                    value={form.description}
                    onChange={update('description')}
                    placeholder="Щорічний конкурс бальних танців для всіх вікових категорій."
                  />
                </div>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label htmlFor="location">Місце проведення</label>
                    <input
                      id="location"
                      required
                      value={form.location}
                      onChange={update('location')}
                      placeholder="м. Львів, Палац культури"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="organizer">Організатор</label>
                    <input
                      id="organizer"
                      required
                      value={form.organizer}
                      onChange={update('organizer')}
                      placeholder='Студія східного танцю «Джерело»'
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="image">Банер (посилання на зображення)</label>
                    <input
                      id="image"
                      type="url"
                      value={form.image}
                      onChange={update('image')}
                      placeholder="https://example.com/poster.jpg"
                    />
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Дати</h2>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label htmlFor="dateFrom">Дата початку</label>
                    <input
                      id="dateFrom"
                      type="date"
                      required
                      value={form.dateFrom}
                      onChange={update('dateFrom')}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="dateTo">Дата завершення</label>
                    <input
                      id="dateTo"
                      type="date"
                      required
                      value={form.dateTo}
                      onChange={update('dateTo')}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="registrationFrom">Реєстрація з</label>
                    <input
                      id="registrationFrom"
                      type="date"
                      required
                      value={form.registrationFrom}
                      onChange={update('registrationFrom')}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="registrationTo">Реєстрація до</label>
                    <input
                      id="registrationTo"
                      type="date"
                      required
                      value={form.registrationTo}
                      onChange={update('registrationTo')}
                    />
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Контакти</h2>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label htmlFor="contactNumber">Телефон</label>
                    <input
                      id="contactNumber"
                      required
                      value={form.contactNumber}
                      onChange={update('contactNumber')}
                      placeholder="+380501234567"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="contactEmail">Email</label>
                    <input
                      id="contactEmail"
                      type="email"
                      required
                      value={form.contactEmail}
                      onChange={update('contactEmail')}
                      placeholder="admin@studio.ua"
                    />
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Реквізити для оплати (необов'язково)</h2>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label htmlFor="paymentRecipient">Отримувач</label>
                    <input
                      id="paymentRecipient"
                      value={form.paymentRecipient}
                      onChange={update('paymentRecipient')}
                      placeholder="ФОП Ковальчук О. М."
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="paymentAccount">Картка / IBAN</label>
                    <input
                      id="paymentAccount"
                      value={form.paymentAccount}
                      onChange={update('paymentAccount')}
                      placeholder="UA123456780000026007233566001"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="paymentBank">Банк</label>
                    <input
                      id="paymentBank"
                      value={form.paymentBank}
                      onChange={update('paymentBank')}
                      placeholder="АТ КБ «ПриватБанк»"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="paymentTaxId">ЄДРПОУ / ІПН</label>
                    <input
                      id="paymentTaxId"
                      value={form.paymentTaxId}
                      onChange={update('paymentTaxId')}
                      placeholder="3214567890"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="paymentPurpose">Призначення платежу</label>
                  <input
                    id="paymentPurpose"
                    value={form.paymentPurpose}
                    onChange={update('paymentPurpose')}
                    placeholder="Організаційний внесок за участь у конкурсі «Зірки Танцполу 2026»"
                  />
                </div>
              </section>

              <div className={styles.actions}>
                <Link to={`/competitions/${id}`} className={styles.btnSecondary}>
                  Скасувати
                </Link>
                <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                  {submitting ? 'Збереження...' : 'Зберегти зміни'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
