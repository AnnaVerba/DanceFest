import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import CompetitionDetails from '../components/CompetitionDetails';
import ContestIcon from '../components/ContestIcon';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import EntriesPanel from '../components/admin/EntriesPanel';
import JudgesPanel from '../components/admin/JudgesPanel';
import NominationsPanel from '../components/admin/NominationsPanel';
import VenuesPanel from '../components/admin/VenuesPanel';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getStoredAdmin, getToken } from '../lib/auth';
import { deleteCompetition, getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { FEATURES } from '../lib/features';
import { getMockCompetitionById } from '../lib/mockCompetitions';
import styles from './CompetitionDetailPage.module.css';

const USE_MOCK_DATA = false;

const ALL_TABS = ['Деталі', 'Номінації', 'Судді', 'Майданчики', 'Заявки'] as const;
type Tab = (typeof ALL_TABS)[number];
const TABS: readonly Tab[] = ALL_TABS.filter(
  (tab) => FEATURES.judges || tab !== 'Судді',
);

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
    return <Navigate to="/" replace />;
  }

  const isOwner = !!admin && !!competition && competition.ownerId === admin.id;

  // Only staff came from the dashboard; everyone else goes back where they
  // were, falling back to the public list.
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(admin ? '/dashboard' : '/');
    }
  };

  return (
    <>
      <main className={styles.main}>
        <div className={styles.wrap}>
          <button type="button" className={styles.back} onClick={goBack}>
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
          </button>

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

              {activeTab === 'Номінації' && (
                <NominationsPanel
                  competitionId={id}
                  canManage={isOwner}
                  onError={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Заявки' && (
                <EntriesPanel
                  competitionId={id}
                  canManage={isOwner}
                  onError={(message) => showToast(message)}
                />
              )}

              {FEATURES.judges && activeTab === 'Судді' && (
                <JudgesPanel
                  competitionId={id}
                  canManage={isOwner}
                  onError={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Майданчики' && (
                <VenuesPanel
                  competitionId={id}
                  canManage={!!admin}
                  onError={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Деталі' && (
                <CompetitionDetails competition={competition} entriesCount={null} />
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
