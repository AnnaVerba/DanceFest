import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import { createVenue, deleteVenue, getVenues } from '../../lib/venues';
import type { Venue } from '../../lib/venues';
import { FEATURES } from '../../lib/features';
import { queryKeys } from '../../lib/queryKeys';
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
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Venue | null>(null);

  const venuesQuery = useQuery({
    queryKey: queryKeys.venues(competitionId),
    queryFn: () => getVenues(competitionId),
  });
  const venues = venuesQuery.data ?? null;
  const loading = venuesQuery.isLoading;

  useEffect(() => {
    if (venuesQuery.isError) onError('Не вдалося завантажити майданчики.');
  }, [venuesQuery.isError, onError]);

  const invalidateVenues = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.venues(competitionId) });

  const createVenueMutation = useMutation({
    mutationFn: () => createVenue(competitionId, name, description),
    onSuccess: invalidateVenues,
  });

  const deleteVenueMutation = useMutation({
    mutationFn: (venueId: string) => deleteVenue(competitionId, venueId),
    onSuccess: invalidateVenues,
  });

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createVenueMutation.isPending) return;
    try {
      await createVenueMutation.mutateAsync();
      setName('');
      setDescription('');
    } catch {
      onError('Не вдалося додати майданчик. Спробуйте ще раз.');
    }
  };

  const handleDelete = async (venue: Venue) => {
    try {
      await deleteVenueMutation.mutateAsync(venue.id);
    } catch {
      onError('Не вдалося видалити майданчик. Спробуйте ще раз.');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <section className={styles.panel}>
      {canManage && (
        <p className={styles.note}>
          {FEATURES.judges && 'Кожен майданчик має свою окрему групу суддів. '}
          Розподіліть готові номінації по майданчикам нижче.
        </p>
      )}

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
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={createVenueMutation.isPending}
          >
            {createVenueMutation.isPending ? 'Додавання…' : 'Додати майданчик'}
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
          {canManage
            ? 'Майданчиків ще немає — додайте перший вище.'
            : 'Для цього конкурсу ще не додано майданчиків.'}
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
