import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import PhoneField from '../components/PhoneField';
import { getToken } from '../lib/auth';
import { CompetitionApiError, getCompetition, updateCompetition } from '../lib/competitions';
import type { CompetitionInput } from '../lib/competitions';
import { getOrganizerSuggestions } from '../lib/users';
import OrganizersField from '../components/OrganizersField';
import {
  PaymentDetailsApiError,
  getPaymentDetails,
  upsertPaymentDetails,
} from '../lib/paymentDetails';
import { UploadApiError, uploadImage } from '../lib/uploads';
import { isValidEmail, isValidPhone } from '../lib/validation';
import styles from './CompetitionFormPage.module.css';

interface ContactFieldErrors {
  contactNumber?: string;
  contactEmail?: string;
  paymentAccount?: string;
  organizers?: string;
}

interface PaymentForm {
  beneficiary: string;
  account: string;
  bankName: string;
  taxId: string;
  destination: string;
}

const EMPTY_FORM: CompetitionInput = {
  image: '',
  name: '',
  description: '',
  location: '',
  organizers: [],
  dateFrom: '',
  dateTo: '',
  registrationFrom: '',
  registrationTo: '',
  contactNumber: '',
  contactEmail: '',
};

const EMPTY_PAYMENT_FORM: PaymentForm = {
  beneficiary: '',
  account: '',
  bankName: '',
  taxId: '',
  destination: '',
};

function toPayload(form: CompetitionInput): CompetitionInput {
  const payload: CompetitionInput = { ...form };
  (Object.keys(payload) as (keyof CompetitionInput)[]).forEach((key) => {
    const value = payload[key];
    if (value === '' || (Array.isArray(value) && value.length === 0)) {
      delete payload[key];
    }
  });
  return payload;
}

export default function CompetitionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<CompetitionInput>(EMPTY_FORM);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [organizerSuggestions, setOrganizerSuggestions] = useState<string[]>([]);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getOrganizerSuggestions()
      .then(setOrganizerSuggestions)
      .catch(() => setOrganizerSuggestions([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([getCompetition(id), getPaymentDetails(id).catch(() => null)])
      .then(([c, payment]) => {
        if (cancelled) return;
        setForm({
          image: c.image ?? '',
          name: c.name,
          description: c.description,
          location: c.location,
          organizers: c.organizers,
          dateFrom: c.dateFrom,
          dateTo: c.dateTo,
          registrationFrom: c.registrationFrom,
          registrationTo: c.registrationTo,
          contactNumber: c.contactNumber,
          contactEmail: c.contactEmail,
        });
        setPaymentForm({
          beneficiary: payment?.beneficiary ?? '',
          account: payment?.account ?? '',
          bankName: payment?.bankName ?? '',
          taxId: payment?.taxId ?? '',
          destination: payment?.destination ?? '',
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

  const updatePayment =
    (key: keyof PaymentForm) => (e: ChangeEvent<HTMLInputElement>) => {
      setPaymentForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (key === 'beneficiary' || key === 'account') {
        setFieldErrors((prev) => ({ ...prev, paymentAccount: undefined }));
      }
    };

  const update =
    (key: keyof CompetitionInput) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleBannerPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerError(null);
    setBannerUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      setBannerError(
        err instanceof UploadApiError ? err.message : 'Не вдалося завантажити банер.',
      );
    } finally {
      setBannerUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    const errors: ContactFieldErrors = {};
    if (form.organizers.length === 0) {
      errors.organizers = 'Вкажіть хоча б одного організатора.';
    }
    if (!form.contactNumber.trim()) {
      errors.contactNumber = 'Вкажіть контактний номер.';
    } else if (!isValidPhone(form.contactNumber)) {
      errors.contactNumber = 'Перевірте формат номера телефону.';
    }
    if (!form.contactEmail.trim()) {
      errors.contactEmail = 'Вкажіть контактний email.';
    } else if (!isValidEmail(form.contactEmail)) {
      errors.contactEmail = 'Перевірте формат email.';
    }
    const hasBeneficiary = paymentForm.beneficiary.trim() !== '';
    const hasAccount = paymentForm.account.trim() !== '';
    if (hasBeneficiary !== hasAccount) {
      errors.paymentAccount = 'Заповніть і отримувача, і номер картки/IBAN — або жодного з двох.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Перевірте позначені поля.');
      return;
    }
    setFieldErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const saved = await updateCompetition(id, toPayload(form));
      if (hasBeneficiary && hasAccount) {
        await upsertPaymentDetails(id, {
          beneficiary: paymentForm.beneficiary.trim(),
          account: paymentForm.account.trim(),
          bankName: paymentForm.bankName.trim() || undefined,
          taxId: paymentForm.taxId.trim() || undefined,
          destination: paymentForm.destination.trim() || undefined,
        });
      }
      navigate(`/competitions/${saved.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof CompetitionApiError || err instanceof PaymentDetailsApiError
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
    return <Navigate to="/" replace />;
  }

  return (
    <>
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
                    <label htmlFor="organizer">Організатори</label>
                    <OrganizersField
                      id="organizer"
                      ariaLabel="Організатори конкурсу"
                      invalid={Boolean(fieldErrors.organizers)}
                      values={form.organizers}
                      onChange={(next) => {
                        setForm((prev) => ({ ...prev, organizers: next }));
                        setFieldErrors((prev) => ({ ...prev, organizers: undefined }));
                      }}
                      suggestions={organizerSuggestions}
                    />
                    {fieldErrors.organizers && (
                      <p className={styles.fieldError}>{fieldErrors.organizers}</p>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="image">Банер</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        id="image"
                        type="url"
                        value={form.image}
                        onChange={update('image')}
                        placeholder="https://example.com/poster.jpg"
                      />
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        style={{ flex: 'none' }}
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={bannerUploading}
                      >
                        {bannerUploading ? 'Завантаження...' : 'Завантажити'}
                      </button>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleBannerPick(e)}
                        style={{ display: 'none' }}
                      />
                    </div>
                    {bannerError && <p className={styles.fieldError}>{bannerError}</p>}
                    {form.image && (
                      <img
                        src={form.image}
                        alt=""
                        style={{
                          marginTop: 10,
                          maxHeight: 120,
                          borderRadius: 7,
                          display: 'block',
                        }}
                      />
                    )}
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
                    <label htmlFor="contactNumber">
                      Телефон <span className={styles.req}>*</span>
                    </label>
                    <PhoneField
                      id="contactNumber"
                      ariaLabel="Телефон"
                      invalid={Boolean(fieldErrors.contactNumber)}
                      value={form.contactNumber}
                      onChange={(v) => {
                        setForm((prev) => ({ ...prev, contactNumber: v }));
                        setFieldErrors((prev) => ({ ...prev, contactNumber: undefined }));
                      }}
                    />
                    {fieldErrors.contactNumber && (
                      <p className={styles.fieldError}>{fieldErrors.contactNumber}</p>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="contactEmail">
                      Email <span className={styles.req}>*</span>
                    </label>
                    <input
                      id="contactEmail"
                      type="email"
                      required
                      className={fieldErrors.contactEmail ? styles.fieldInvalid : undefined}
                      value={form.contactEmail}
                      onChange={(e) => {
                        update('contactEmail')(e);
                        setFieldErrors((prev) => ({ ...prev, contactEmail: undefined }));
                      }}
                      placeholder="admin@studio.ua"
                    />
                    {fieldErrors.contactEmail && (
                      <p className={styles.fieldError}>{fieldErrors.contactEmail}</p>
                    )}
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
                      className={fieldErrors.paymentAccount ? styles.fieldInvalid : undefined}
                      value={paymentForm.beneficiary}
                      onChange={updatePayment('beneficiary')}
                      placeholder="ФОП Ковальчук О. М."
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="paymentAccount">Картка / IBAN</label>
                    <input
                      id="paymentAccount"
                      className={fieldErrors.paymentAccount ? styles.fieldInvalid : undefined}
                      value={paymentForm.account}
                      onChange={updatePayment('account')}
                      placeholder="UA123456780000026007233566001"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="paymentBank">Банк</label>
                    <input
                      id="paymentBank"
                      value={paymentForm.bankName}
                      onChange={updatePayment('bankName')}
                      placeholder="АТ КБ «ПриватБанк»"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="paymentTaxId">ЄДРПОУ / ІПН</label>
                    <input
                      id="paymentTaxId"
                      value={paymentForm.taxId}
                      onChange={updatePayment('taxId')}
                      placeholder="3214567890"
                    />
                  </div>
                </div>
                {fieldErrors.paymentAccount && (
                  <p className={styles.fieldError}>{fieldErrors.paymentAccount}</p>
                )}
                <div className={styles.field}>
                  <label htmlFor="paymentPurpose">Призначення платежу</label>
                  <input
                    id="paymentPurpose"
                    value={paymentForm.destination}
                    onChange={updatePayment('destination')}
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
