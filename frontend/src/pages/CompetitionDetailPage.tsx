import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import EntriesPanel from '../components/admin/EntriesPanel';
import JudgesPanel from '../components/admin/JudgesPanel';
import VenuesPanel from '../components/admin/VenuesPanel';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getStoredAdmin, getToken } from '../lib/auth';
import {
  deleteCompetition,
  getCompetition,
  getCompetitionStatus,
} from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { getMockCompetitionById } from '../lib/mockCompetitions';
import styles from './CompetitionDetailPage.module.css';

const USE_MOCK_DATA = false;

const TABS = ['Деталі', 'Судді', 'Майданчики', 'Заявки'] as const;
type Tab = (typeof TABS)[number];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateRange(dateFrom: string, dateTo: string): string {
  return dateFrom === dateTo
    ? `${formatDate(dateFrom)} р.`
    : `${formatDate(dateFrom)} – ${formatDate(dateTo)} р.`;
}

function ContestIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10" />
      <path d="M12 14v3M9 20h6M10 17h4" />
    </svg>
  );
}

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const admin = getStoredAdmin();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Деталі');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { toasts, showToast } = useToasts();

  useEffect(() => {
    if (!id) return;

    if (USE_MOCK_DATA) {
      const mock = getMockCompetitionById(id);
      if (mock) {
        setCompetition(mock);
      } else {
        setLoadError('Не вдалося завантажити конкурс.');
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    getCompetition(id)
      .then((data) => {
        if (!cancelled) setCompetition(data);
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

  const handleDelete = async () => {
    if (!competition) return;
    try {
      await deleteCompetition(competition.id);
      showToast(`Конкурс «${competition.name}» видалено`);
      navigate('/dashboard');
    } catch {
      showToast('Не вдалося видалити конкурс. Спробуйте ще раз.');
      setConfirmingDelete(false);
    }
  };

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!id) {
    return <Navigate to="/dashboard" replace />;
  }

  const isOwner = !!admin && !!competition && competition.ownerId === admin.id;
  const payment = competition?.paymentDetails ?? null;

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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Назад до списку
          </Link>

          {loading && <p className={styles.status}>Завантаження...</p>}
          {loadError && <p className={styles.status}>{loadError}</p>}

          {!loading && !loadError && competition && (
            <article className={styles.card}>
              <div className={styles.contestHead}>
                <span className={styles.contestHeadIcon} aria-hidden="true">
                  <ContestIcon />
                </span>
                <h1>{competition.name}</h1>
              </div>

              <div className={styles.tabs} role="tablist" aria-label="Розділи конкурсу">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={styles.tab}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Заявки' && (
                <EntriesPanel
                  competitionId={id}
                  canManage={isOwner}
                  onError={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Судді' && (
                <JudgesPanel
                  competitionId={id}
                  canManage={isOwner}
                  onError={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Майданчики' && (
                <VenuesPanel
                  competitionId={id}
                  canManage={isOwner}
                  onError={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Деталі' && (
                <>
                  <section className={styles.section}>
                    <div className={`${styles.grid} ${styles.grid3}`}>
                      <div className={styles.item}>
                        <div className={styles.itemLabel}>Статус</div>
                        <div className={styles.itemValue}>
                          {getCompetitionStatus(competition)}
                        </div>
                      </div>
                      <div className={styles.item}>
                        <div className={styles.itemLabel}>Дата</div>
                        <div className={styles.itemValue}>
                          {formatDateRange(competition.dateFrom, competition.dateTo)}
                        </div>
                      </div>
                      <div className={styles.item}>
                        <div className={styles.itemLabel}>Місце</div>
                        <div className={styles.itemValue}>
                          {competition.location || '—'}
                        </div>
                      </div>
                      <div className={styles.item}>
                        <div className={styles.itemLabel}>Організатор</div>
                        <div className={styles.itemValue}>
                          {competition.organizer || '—'}
                        </div>
                      </div>
                      <div className={styles.item}>
                        <div className={styles.itemLabel}>Реєстрація</div>
                        <div className={styles.itemValue}>
                          {formatDateRange(
                            competition.registrationFrom,
                            competition.registrationTo,
                          )}
                        </div>
                      </div>
                    </div>
                    {competition.description && (
                      <p className={styles.description}>{competition.description}</p>
                    )}
                  </section>

                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Контакти</h2>
                    <div className={`${styles.grid} ${styles.grid2}`}>
                      <div className={styles.item}>
                        <div className={styles.itemLabel}>Телефон</div>
                        <div className={styles.itemValue}>
                          {competition.contactNumber ? (
                            <a href={`tel:${competition.contactNumber}`}>
                              {competition.contactNumber}
                            </a>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                      <div className={styles.item}>
                        <div className={styles.itemLabel}>Email</div>
                        <div className={styles.itemValue}>
                          {competition.contactEmail ? (
                            <a href={`mailto:${competition.contactEmail}`}>
                              {competition.contactEmail}
                            </a>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Реквізити для оплати</h2>
                    {payment ? (
                      <>
                        <p className={styles.sectionNote}>
                          Оплата приймається лише переказом за реквізитами, без
                          оплати через застосунок.
                        </p>
                        <div className={`${styles.grid} ${styles.grid2}`}>
                          <div className={styles.item}>
                            <div className={styles.itemLabel}>Отримувач</div>
                            <div className={styles.itemValue}>{payment.beneficiary}</div>
                          </div>
                          <div className={styles.item}>
                            <div className={styles.itemLabel}>Картка / IBAN</div>
                            <div className={styles.itemValue}>{payment.account}</div>
                          </div>
                          {payment.bankName && (
                            <div className={styles.item}>
                              <div className={styles.itemLabel}>Банк</div>
                              <div className={styles.itemValue}>{payment.bankName}</div>
                            </div>
                          )}
                          {payment.taxId && (
                            <div className={styles.item}>
                              <div className={styles.itemLabel}>ЄДРПОУ / ІПН</div>
                              <div className={styles.itemValue}>{payment.taxId}</div>
                            </div>
                          )}
                        </div>
                        {payment.destination && (
                          <div className={styles.grid} style={{ marginTop: 20 }}>
                            <div className={styles.item}>
                              <div className={styles.itemLabel}>
                                Призначення платежу
                              </div>
                              <div className={styles.itemValue}>{payment.destination}</div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className={styles.sectionNote}>
                        Організатор не вказав реквізити для оплати.
                      </p>
                    )}
                  </section>

                </>
              )}

              {isOwner && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Видалити
                  </button>
                  <Link to={`/competitions/${id}/edit`} className={styles.btnPrimary}>
                    Редагувати
                  </Link>
                </div>
              )}
            </article>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmingDelete}
        title="Видалити конкурс?"
        description={
          competition
            ? `Видалити «${competition.name}»? Цю дію не можна скасувати.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />

      <ToastStack toasts={toasts} />
    </>
  );
}
