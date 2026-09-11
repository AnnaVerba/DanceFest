import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import CompetitionDetails from '../components/CompetitionDetails';
import ContestIcon from '../components/ContestIcon';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import EntriesPanel from '../components/admin/EntriesPanel';
import JudgesPanel from '../components/admin/JudgesPanel';
import MusicExportPanel from '../components/admin/MusicExportPanel';
import NominationsPanel from '../components/admin/NominationsPanel';
import OveragesPanel from '../components/admin/OveragesPanel';
import VenuesPanel from '../components/admin/VenuesPanel';
import SchedulePanel from '../components/admin/schedule/SchedulePanel';
import ScheduleSettings from '../components/admin/schedule/ScheduleSettings';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getStoredAdmin, getToken } from '../lib/auth';
import {
  deleteCompetition,
  getApplyEligibility,
  getCompetition,
} from '../lib/competitions';
import { FEATURES } from '../lib/features';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import { queryKeys } from '../lib/queryKeys';
import styles from './CompetitionDetailPage.module.css';

const ALL_TABS = [
  'Деталі',
  'Номінації',
  'Судді',
  'Майданчики',
  'Заявки',
  'Доплати',
  'Таймінги',
  'Програма',
] as const;
type Tab = (typeof ALL_TABS)[number];
const TABS: readonly Tab[] = ALL_TABS.filter(
  (tab) => FEATURES.judges || tab !== 'Судді',
);

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const admin = getStoredAdmin();

  const [activeTab, setActiveTab] = useState<Tab>('Деталі');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { toasts, showToast } = useToasts();

  const competitionQuery = useQuery({
    queryKey: queryKeys.competition(id ?? ''),
    queryFn: () => getCompetition(id!),
    enabled: !!id,
  });
  const competition = competitionQuery.data ?? null;
  const loading = competitionQuery.isLoading;
  const loadError = competitionQuery.isError
    ? 'Не вдалося завантажити конкурс.'
    : null;

  const handleDelete = async () => {
    if (!competition) return;
    try {
      await deleteCompetition(competition.id);
      queryClient.removeQueries({ queryKey: queryKeys.competition(competition.id) });
      await queryClient.invalidateQueries({ queryKey: ['competitions'] });
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
  // An admin manages every competition's applications; an organizer only
  // the ones they own.
  const isAdmin = !!admin && meetsLevel(admin.accessLevel, ACCESS_LEVEL.ADMIN);
  const canManageEntries = isOwner || isAdmin;

  // The entries list is staff-only (a participant only ever sees their own
  // entries, in their cabinet) — so is its whole search/filter toolbar.
  // Overages are organizer/admin-only money data — tighter than "Заявки",
  // which any staff account can open.
  const visibleTabs = TABS.filter((tab) => {
    if (tab === 'Заявки') return !!admin;
    if (tab === 'Доплати') return canManageEntries;
    return true;
  });

  // The single apply entry point on this page lives in the header next to
  // the name; an owner/admin may still open it after registration closes.
  const apply = competition
    ? getApplyEligibility(competition, { isOrganizer: canManageEntries })
    : null;

  // "Назад до списку" always goes to a list, never the previous page:
  // staff to the dashboard, everyone else to the public list.
  const listPath = admin ? '/dashboard' : '/';

  return (
    <>
      <main className={styles.main}>
        <div className={styles.wrap}>
          <Link to={listPath} className={styles.back}>
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
                {apply &&
                  (apply.allowed ? (
                    <Link
                      to={`/competitions/${id}/apply`}
                      className={styles.applyButton}
                    >
                      Подати заявку
                    </Link>
                  ) : (
                    <span
                      className={`${styles.applyButton} ${styles.applyDisabled}`}
                      aria-disabled="true"
                      title={apply.reason ?? ''}
                    >
                      Подати заявку
                    </span>
                  ))}
              </div>
              {apply && !apply.allowed && (
                <p className={styles.applyNote}>{apply.reason}</p>
              )}

              <div className={styles.tabs} role="tablist" aria-label="Розділи конкурсу">
                {visibleTabs.map((tab) => (
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

              {activeTab === 'Заявки' && !!admin && (
                <EntriesPanel
                  competitionId={id}
                  canManage={canManageEntries}
                  onError={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Доплати' && canManageEntries && (
                <OveragesPanel
                  competitionId={id}
                  canManage={canManageEntries}
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

              {activeTab === 'Таймінги' && (
                <ScheduleSettings
                  competitionId={id}
                  canManage={isOwner}
                  onError={(message) => showToast(message)}
                  onSaved={(message) => showToast(message)}
                />
              )}

              {activeTab === 'Програма' && (
                <>
                  <Link
                    to={`/competitions/${id}/schedule`}
                    className={styles.back}
                  >
                    Відкрити повну програму фестивалю →
                  </Link>
                  <SchedulePanel
                    competitionId={id}
                    competition={competition}
                    canManage={isOwner}
                    onError={(message) => showToast(message)}
                    onNotice={(message) => showToast(message)}
                  />
                  <MusicExportPanel competitionId={id} canManage={canManageEntries} />
                </>
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
