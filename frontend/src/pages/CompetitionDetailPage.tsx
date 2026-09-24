import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CompetitionDetails from '../components/CompetitionDetails';
import ContestIcon from '../components/ContestIcon';
import ContestTitle from '../components/ContestTitle';
import AwardsSummary from '../components/awards/AwardsSummary';
import FestivalProgram from '../components/program/FestivalProgram';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import EntriesPanel from '../components/admin/EntriesPanel';
import FinancePanel from '../components/admin/FinancePanel';
import JudgesPanel from '../components/admin/JudgesPanel';
import MusicExportPanel from '../components/admin/MusicExportPanel';
import NominationsPanel from '../components/admin/NominationsPanel';
import OveragesPanel from '../components/admin/OveragesPanel';
import VenuesPanel from '../components/admin/VenuesPanel';
import SchedulePanel from '../components/admin/schedule/SchedulePanel';
import ScheduleSettings from '../components/admin/schedule/ScheduleSettings';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getSession, getStoredAdmin, getToken } from '../lib/auth';
import {
  deleteCompetition,
  getApplyEligibility,
  getCompetition,
} from '../lib/competitions';
import { getTeam } from '../lib/team';
import { FEATURES } from '../lib/features';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import { queryKeys } from '../lib/queryKeys';
import { TAB_QUERY_PARAM, VENUES_TAB_SLUG } from '../lib/competitionTabs.constants';
import styles from './CompetitionDetailPage.module.css';

const ALL_TABS = [
  'Деталі',
  'Номінації',
  'Судді',
  'Майданчики',
  'Заявки',
  'Доплати',
  'Фінанси',
  'Таймінги',
  'Програма',
  'Нагороди',
] as const;
type Tab = (typeof ALL_TABS)[number];
const DEFAULT_TAB: Tab = 'Деталі';
const PUBLIC_TABS: readonly Tab[] = [DEFAULT_TAB, 'Програма'];
// Shown to a global admin only — not even to the competition's own staff.
const ADMIN_ONLY_TABS: readonly Tab[] = ['Номінації'];
// A coach (керівник) also gets the applications list, read-only.
const COACH_READ_ONLY_TABS: readonly Tab[] = ['Заявки'];
const TABS: readonly Tab[] = ALL_TABS.filter(
  (tab) =>
    (FEATURES.judges || tab !== 'Судді') &&
    (FEATURES.schedule || (tab !== 'Таймінги' && tab !== 'Програма')),
);

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const admin = getStoredAdmin();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    searchParams.get(TAB_QUERY_PARAM) === VENUES_TAB_SLUG ? 'Майданчики' : 'Деталі',
  );
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

  // A competition's team (owner + invited co-organizers) can also manage
  // it — /team 200s only for those two groups, 403s for everyone else, so
  // a successful fetch is itself the membership check. Gated to ORGANIZER+
  // so a participant/coach viewing a competition page doesn't fire it.
  const teamQuery = useQuery({
    queryKey: ['competition-team', id],
    queryFn: () => getTeam(id!),
    enabled:
      !!id && !!admin && meetsLevel(admin.accessLevel, ACCESS_LEVEL.ORGANIZER),
    retry: false,
  });
  const isTeamMember = teamQuery.isSuccess;

  const handleDelete = async () => {
    if (!competition) return;
    try {
      await deleteCompetition(competition.id);
      queryClient.removeQueries({ queryKey: queryKeys.competition(competition.id) });
      await queryClient.invalidateQueries({ queryKey: ['competitions'] });
      showToast(`Конкурс «${competition.name}» видалено`);
      navigate('/');
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

  // An account listed among the competition's organizers has the owner's
  // rights, so it counts as the owner here.
  const isOwner =
    !!admin &&
    !!competition &&
    (competition.ownerId === admin.id || competition.organizerIds.includes(admin.id));
  // An admin manages every competition exactly like its owner (details,
  // nominations, judges, applications); an organizer only the ones they own.
  const isAdmin = !!admin && meetsLevel(admin.accessLevel, ACCESS_LEVEL.ADMIN);
  const canManage = isOwner || isAdmin;
  // Applications, overages and editing the competition are also open to an
  // invited co-organizer (team member).
  const canManageEntries = canManage || isTeamMember;
  // `admin` is null below ORGANIZER, so a coach is read off the session.
  const session = getSession();
  const isCoach =
    !!session && meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.COACH);

  // Only the details and programme are public. Every working tab belongs
  // to the competition's staff (owner, invited team, admin) — a pending
  // organizer request or another competition's organizer gets none of them;
  // the server enforces the same rule. Nominations are for admins only.
  // A coach additionally reads the applications list, without editing.
  const visibleTabs = TABS.filter((tab) => {
    if (ADMIN_ONLY_TABS.includes(tab)) return isAdmin;
    if (COACH_READ_ONLY_TABS.includes(tab) && isCoach) return true;
    return PUBLIC_TABS.includes(tab) || canManageEntries;
  });

  // A tab the viewer may not see (e.g. from ?tab=venues) falls back to the details.
  const shownTab: Tab = visibleTabs.includes(activeTab) ? activeTab : DEFAULT_TAB;

  // The single apply entry point on this page lives in the header next to
  // the name; an owner/admin may still open it after registration closes,
  // and an admin even after the competition is over.
  const apply = competition
    ? getApplyEligibility(competition, { isOrganizer: canManage, isAdmin })
    : null;

  // "Назад до списку" always goes to the catalog, never the previous page.
  const listPath = '/';

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
                <ContestTitle
                  name={competition.name}
                  dateFrom={competition.dateFrom}
                  dateTo={competition.dateTo}
                />
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
                {canManageEntries && (
                  <Link
                    to={`/competitions/${id}/edit`}
                    className={styles.editButton}
                  >
                    Редагувати
                  </Link>
                )}
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
                    aria-selected={shownTab === tab}
                    className={styles.tab}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {shownTab === 'Номінації' && (
                <NominationsPanel
                  competitionId={id}
                  canManage={canManage}
                  onError={showToast}
                />
              )}

              {shownTab === 'Заявки' && (isCoach || !!admin) && (
                <>
                  <MusicExportPanel competitionId={id} canManage={canManageEntries} />
                  <EntriesPanel
                    competitionId={id}
                    canManage={canManageEntries}
                    canViewAmounts
                    onError={showToast}
                  />
                </>
              )}

              {shownTab === 'Доплати' && canManageEntries && (
                <OveragesPanel
                  competitionId={id}
                  canManage={canManageEntries}
                  onError={showToast}
                />
              )}

              {activeTab === 'Фінанси' && canManageEntries && (
                <FinancePanel
                  competitionId={id}
                  onError={showToast}
                />
              )}

              {FEATURES.judges && shownTab === 'Судді' && (
                <JudgesPanel
                  competitionId={id}
                  canManage={canManage}
                  onError={showToast}
                />
              )}

              {shownTab === 'Майданчики' && (
                <VenuesPanel
                  competitionId={id}
                  canManage={canManageEntries}
                  onError={(message) => showToast(message)}
                />
              )}

              {FEATURES.schedule && shownTab === 'Таймінги' && (
                <ScheduleSettings
                  competitionId={id}
                  canManage={canManage}
                  onError={showToast}
                  onSaved={(message) => showToast(message)}
                />
              )}

              {/* One programme view: the editor for whoever manages it,
                  the read-only programme (with "your performances") for
                  everyone else. The music export lives under "Заявки". */}
              {FEATURES.schedule &&
                shownTab === 'Програма' &&
                (canManage ? (
                  <SchedulePanel
                    competitionId={id}
                    competition={competition}
                    canManage
                    canBuildAnytime={isAdmin}
                    onError={showToast}
                    onNotice={(message) => showToast(message)}
                  />
                ) : (
                  <FestivalProgram competitionId={id} />
                ))}

              {shownTab === 'Нагороди' && !!admin && (
                <AwardsSummary competitionId={id} />
              )}

              {shownTab === 'Деталі' && (
                <CompetitionDetails competition={competition} entriesCount={null} />
              )}

              {/* Deleting the competition belongs to its details, not to
                  every tab. Editing sits up in the header, by Подати заявку. */}
              {shownTab === 'Деталі' && isOwner && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Видалити
                  </button>
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
