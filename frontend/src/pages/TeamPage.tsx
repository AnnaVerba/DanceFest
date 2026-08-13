import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import AddAdminModal from '../components/admin/AddAdminModal';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import KebabMenu from '../components/admin/KebabMenu';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getToken } from '../lib/auth';
import {
  getTeam,
  removeAdmin,
  resendInvitation,
  revokeInvitation,
} from '../lib/team';
import type { TeamAdmin, TeamData, TeamInvitation } from '../lib/team';
import styles from './TeamPage.module.css';

type PendingAction =
  | { kind: 'revoke'; invitation: TeamInvitation }
  | { kind: 'remove'; admin: TeamAdmin }
  | null;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function TeamPage() {
  const { id: competitionId } = useParams<{ id: string }>();

  const [team, setTeam] = useState<TeamData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [addModalOpen, setAddModalOpen] = useState(false);
  // Змінюємо key при кожному відкритті, щоб модалка монтувалась заново
  // з чистим станом (без ефекту-скидання полів).
  const [addModalKey, setAddModalKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const { toasts, showToast } = useToasts();

  // loading/loadError стартують у стані "йде завантаження" (див. useState нижче),
  // тож тут лишаються тільки setState-виклики вже після await — без синхронного
  // setState прямо в тілі ефекту.
  const loadTeam = useCallback(async () => {
    if (!competitionId) return;
    try {
      const data = await getTeam(competitionId);
      setTeam(data);
      setLoadError(null);
    } catch {
      setLoadError('Не вдалося завантажити команду конкурсу. Спробуйте оновити сторінку.');
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    // Дата-фетч на маунті: усі setState в loadTeam виконуються вже після
    // await, але статичний аналіз цього правила не бачить різниці.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTeam();
  }, [loadTeam]);

  // Без токена цьому екрану робити нічого — сюди дійде повноцінний
  // AuthGuard на маршруті, коли з'явиться більше захищених сторінок.
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!competitionId) {
    return <Navigate to="/" replace />;
  }

  const isOwner = team?.viewerRole === 'owner';
  const admins = team?.admins ?? [];
  const invitations = team?.invitations ?? [];
  const isEmpty = admins.length === 0 && invitations.length === 0;

  const openAddModal = () => {
    setAddModalKey((k) => k + 1);
    setAddModalOpen(true);
  };

  const handleInviteSuccess = (invitation: TeamInvitation) => {
    setTeam((prev) => (prev ? { ...prev, invitations: [...prev.invitations, invitation] } : prev));
    setAddModalOpen(false);
    showToast(`Запрошення надіслано на ${invitation.email}`);
  };

  const handleResendExisting = async (email: string) => {
    const match = invitations.find(
      (i) => i.email.toLowerCase() === email.toLowerCase(),
    );
    if (!match) return;
    const { expiresAt } = await resendInvitation(competitionId, match.id);
    setTeam((prev) =>
      prev
        ? {
            ...prev,
            invitations: prev.invitations.map((i) =>
              i.id === match.id ? { ...i, expiresAt } : i,
            ),
          }
        : prev,
    );
  };

  const handleResendRow = async (invitation: TeamInvitation) => {
    const { expiresAt } = await resendInvitation(competitionId, invitation.id);
    setTeam((prev) =>
      prev
        ? {
            ...prev,
            invitations: prev.invitations.map((i) =>
              i.id === invitation.id ? { ...i, expiresAt } : i,
            ),
          }
        : prev,
    );
    showToast(`Запрошення повторно надіслано на ${invitation.email}`);
  };

  const handleConfirmRevoke = async (invitation: TeamInvitation) => {
    await revokeInvitation(competitionId, invitation.id);
    setTeam((prev) =>
      prev
        ? { ...prev, invitations: prev.invitations.filter((i) => i.id !== invitation.id) }
        : prev,
    );
    setPendingAction(null);
    showToast(`Запрошення для ${invitation.email} відкликано`);
  };

  const handleConfirmRemove = async (admin: TeamAdmin) => {
    await removeAdmin(competitionId, admin.id);
    setTeam((prev) =>
      prev ? { ...prev, admins: prev.admins.filter((a) => a.id !== admin.id) } : prev,
    );
    setPendingAction(null);
    showToast(`${admin.name} видалено зі списку адміністраторів`);
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link to={`/competitions/${competitionId}`} className={styles.back}>
          ← Назад до конкурсу
        </Link>

        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Команда конкурсу</h1>
          </div>
          {isOwner && !isEmpty && (
            <button type="button" className={styles.addBtn} onClick={openAddModal}>
              + Додати адміна
            </button>
          )}
        </div>
        {team?.competition && (
          <p className={styles.subtitle}>
            {team.competition.name} ·{' '}
            {formatDateFull(team.competition.dateFrom)} –{' '}
            {formatDateFull(team.competition.dateTo)}
          </p>
        )}

        {loading && <p className={styles.subEmpty}>Завантаження…</p>}
        {loadError && <p className={styles.loadError}>{loadError}</p>}

        {!loading && !loadError && (
          <div className={styles.card}>
            {isEmpty ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon} aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className={styles.emptyText}>
                  Поки що ви єдина людина, яка керує конкурсом
                </p>
                {isOwner && (
                  <button type="button" className={styles.addBtn} onClick={openAddModal}>
                    + Додати адміна
                  </button>
                )}
              </div>
            ) : (
              <>
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>Організатор</div>
                  {team?.organizer && (
                    <div className={styles.row}>
                      <div className={styles.avatar}>{getInitials(team.organizer.name)}</div>
                      <div className={styles.identity}>
                        <div className={styles.name}>
                          {team.organizer.name}
                          <span className={`${styles.badge} ${styles.badgeOwner}`}>
                            Власник
                          </span>
                        </div>
                        <div className={styles.email}>{team.organizer.email}</div>
                      </div>
                    </div>
                  )}
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionHeader}>Адміністратори</div>
                  {admins.length === 0 ? (
                    <p className={styles.subEmpty}>Ще немає жодного адміністратора</p>
                  ) : (
                    admins.map((admin) => (
                      <div className={styles.row} key={admin.id}>
                        <div className={styles.avatar}>{getInitials(admin.name)}</div>
                        <div className={styles.identity}>
                          <div className={styles.name}>{admin.name}</div>
                          <div className={styles.email}>{admin.email}</div>
                        </div>
                        <div className={styles.meta}>
                          додано {formatDateFull(admin.addedAt)}
                        </div>
                        {isOwner && (
                          <KebabMenu
                            items={[
                              {
                                label: 'Видалити',
                                destructive: true,
                                onSelect: () => setPendingAction({ kind: 'remove', admin }),
                              },
                            ]}
                          />
                        )}
                      </div>
                    ))
                  )}
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionHeader}>Запрошення</div>
                  {invitations.length === 0 ? (
                    <p className={styles.subEmpty}>Активних запрошень немає</p>
                  ) : (
                    invitations.map((invitation) => (
                      <div className={styles.row} key={invitation.id}>
                        <div className={styles.avatar}>
                          {getInitials(invitation.name ?? invitation.email)}
                        </div>
                        <div className={styles.identity}>
                          <div className={styles.name}>
                            {invitation.name ?? (
                              <span className={styles.nameMuted}>Без імені</span>
                            )}
                            <span className={`${styles.badge} ${styles.badgeInvited}`}>
                              Запрошено
                            </span>
                          </div>
                          <div className={styles.email}>{invitation.email}</div>
                        </div>
                        <div className={styles.meta}>
                          діє до {formatDateShort(invitation.expiresAt)}
                        </div>
                        {isOwner && (
                          <KebabMenu
                            items={[
                              {
                                label: 'Надіслати повторно',
                                onSelect: () => handleResendRow(invitation),
                              },
                              {
                                label: 'Відкликати',
                                destructive: true,
                                onSelect: () =>
                                  setPendingAction({ kind: 'revoke', invitation }),
                              },
                            ]}
                          />
                        )}
                      </div>
                    ))
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>

      <AddAdminModal
        key={addModalKey}
        open={addModalOpen}
        competitionId={competitionId}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleInviteSuccess}
        onResendExisting={handleResendExisting}
      />

      <ConfirmDialog
        open={pendingAction?.kind === 'revoke'}
        title="Відкликати запрошення?"
        description={
          pendingAction?.kind === 'revoke'
            ? `Відкликати запрошення для ${pendingAction.invitation.email}? Посилання з листа перестане працювати.`
            : ''
        }
        confirmLabel="Відкликати"
        onCancel={() => setPendingAction(null)}
        onConfirm={() =>
          pendingAction?.kind === 'revoke'
            ? handleConfirmRevoke(pendingAction.invitation)
            : undefined
        }
      />

      <ConfirmDialog
        open={pendingAction?.kind === 'remove'}
        title="Видалити адміністратора?"
        description={
          pendingAction?.kind === 'remove'
            ? `Видалити «${pendingAction.admin.name}» зі списку адміністраторів? Ця людина втратить доступ одразу, навіть якщо зараз працює в системі.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingAction(null)}
        onConfirm={() =>
          pendingAction?.kind === 'remove'
            ? handleConfirmRemove(pendingAction.admin)
            : undefined
        }
      />

      <ToastStack toasts={toasts} />
    </main>
  );
}
