import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { createVenue, deleteVenue, getVenues } from '../../lib/venues';
import type { Venue } from '../../lib/venues';
import styles from './VenuesPanel.module.css';

interface VenuesPanelProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
}

export default function VenuesPanel({
  competitionId,
  canManage,
  onError,
}: VenuesPanelProps) {
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Venue | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVenues(competitionId)
      .then((data) => {
        if (!cancelled) setVenues(data);
      })
      .catch(() => {
        if (!cancelled) onError('Не вдалося завантажити майданчики.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createVenue(competitionId, name, description);
      setVenues((prev) => [...(prev ?? []), created]);
      setName('');
      setDescription('');
    } catch {
      onError('Не вдалося додати майданчик. Спробуйте ще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (venue: Venue) => {
    try {
      await deleteVenue(competitionId, venue.id);
      setVenues((prev) => prev?.filter((v) => v.id !== venue.id) ?? prev);
    } catch {
      onError('Не вдалося видалити майданчик. Спробуйте ще раз.');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <section className={styles.panel}>
      <p className={styles.note}>
        Кожен майданчик має свою окрему групу суддів. Розподіліть готові
        номінації по майданчикам нижче.
      </p>

      {canManage && (
        <form className={styles.addVenue} onSubmit={handleAdd}>
          <input
            className={styles.input}
            type="text"
            placeholder="Назва майданчика (напр. Сцена A)"
            aria-label="Назва майданчика"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="text"
            placeholder="Опис / коментар"
            aria-label="Опис майданчика"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit" className={styles.btnPrimary} disabled={submitting}>
            {submitting ? 'Додавання…' : 'Додати майданчик'}
          </button>
        </form>
      )}

      {loading && <p className={styles.status}>Завантаження...</p>}

      {!loading && venues && venues.length > 0 && (
        <ul className={styles.venues}>
          {venues.map((venue) => (
            <li key={venue.id} className={styles.venue}>
              <div className={styles.venueInfo}>
                <div className={styles.venueName}>{venue.name}</div>
                {venue.description && (
                  <div className={styles.venueDescription}>{venue.description}</div>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  className={styles.btnLink}
                  aria-label={`Видалити майданчик ${venue.name}`}
                  onClick={() => setPendingDelete(venue)}
                >
                  Видалити
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && venues && venues.length === 0 && (
        <p className={styles.empty}>
          Для цього конкурсу ще не сформовано номінацій.
        </p>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити майданчик?"
        description={
          pendingDelete
            ? `Видалити «${pendingDelete.name}» зі списку майданчиків? Ця дія незворотна.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? handleDelete(pendingDelete) : undefined)}
      />
    </section>
  );
}
