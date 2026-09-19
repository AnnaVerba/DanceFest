import { useEffect, useState } from 'react';
import Modal from '../Modal';
import type { CompetitionDay, SectionSummary } from '../../../lib/schedule';
import type { Venue } from '../../../lib/venues';
import { VENUE_UNASSIGNED_LABEL } from '../../../lib/nominationVenue.constants';
import styles from './Schedule.module.css';

interface AddToSectionModalProps {
  open: boolean;
  exitCount: number;
  days: CompetitionDay[];
  sections: SectionSummary[];
  venues: Venue[];
  defaultDayId: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (sectionId: string) => void;
}

export default function AddToSectionModal({
  open,
  exitCount,
  days,
  sections,
  venues,
  defaultDayId,
  submitting,
  onCancel,
  onSubmit,
}: AddToSectionModalProps) {
  const [dayId, setDayId] = useState(defaultDayId || days[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const daySections = sections.filter((section) => section.dayId === dayId);

  // Every venue runs its own «Відділення 1, 2…», so same-named sections of
  // different venues are told apart by their venue group.
  const venueName = new Map(venues.map((venue) => [venue.id, venue.name]));
  const byVenue = new Map<string, SectionSummary[]>();
  for (const section of daySections) {
    const label =
      (section.venueId && venueName.get(section.venueId)) ||
      VENUE_UNASSIGNED_LABEL;
    byVenue.set(label, [...(byVenue.get(label) ?? []), section]);
  }

  useEffect(() => {
    if (open) setDayId(defaultDayId || days[0]?.id || '');
  }, [open, defaultDayId, days]);

  // A day change offers that day's first section.
  const firstSectionId = daySections[0]?.id ?? '';
  useEffect(() => {
    setSectionId(firstSectionId);
  }, [dayId, firstSectionId]);

  return (
    <Modal
      open={open}
      title="Додати у відділення"
      onClose={onCancel}
      closeDisabled={submitting}
    >
      <div className={styles.modalBody}>
        <p className={styles.counter}>Виходів до додавання: {exitCount}</p>
        {days.length > 1 && (
          <div className={styles.modalField}>
            <label htmlFor="addSectionDay">День</label>
            <select
              id="addSectionDay"
              className={styles.input}
              value={dayId}
              onChange={(e) => setDayId(e.target.value)}
              disabled={submitting}
            >
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label ?? day.date}
                </option>
              ))}
            </select>
          </div>
        )}
        {daySections.length === 0 ? (
          <p className={styles.counter}>У цьому дні ще немає відділень.</p>
        ) : (
          <div className={styles.modalField}>
            <label htmlFor="addSectionTarget">Відділення</label>
            <select
              id="addSectionTarget"
              className={styles.input}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={submitting}
            >
              {[...byVenue].map(([label, venueSections]) => (
                <optgroup key={label} label={label}>
                  {venueSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.btn}
            onClick={onCancel}
            disabled={submitting}
          >
            Скасувати
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={sectionId === '' || submitting}
            onClick={() => onSubmit(sectionId)}
          >
            {submitting ? 'Додавання…' : 'Додати'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
