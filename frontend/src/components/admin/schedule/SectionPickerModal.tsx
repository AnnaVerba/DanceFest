import { useEffect, useState } from 'react';
import Modal from '../Modal';
import type { CompetitionDay, SectionSummary } from '../../../lib/schedule';
import type { Venue } from '../../../lib/venues';
import { VENUE_UNASSIGNED_LABEL } from '../../../lib/nominationVenue.constants';
import type { SectionPickerTexts } from './sectionPicker.types';
import styles from './Schedule.module.css';

interface SectionPickerModalProps {
  open: boolean;
  texts: SectionPickerTexts;
  // Shown above the pickers, e.g. how many exits are being added.
  summary: string;
  days: CompetitionDay[];
  sections: SectionSummary[];
  venues: Venue[];
  defaultDayId: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (sectionId: string) => void;
}

// Picks a formed section: a day, then one of its sections grouped by venue —
// every venue runs its own «Відділення 1, 2…», so same-named sections of
// different venues are told apart by their venue group.
export default function SectionPickerModal({
  open,
  texts,
  summary,
  days,
  sections,
  venues,
  defaultDayId,
  submitting,
  onCancel,
  onSubmit,
}: SectionPickerModalProps) {
  const [dayId, setDayId] = useState(defaultDayId || days[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const daySections = sections.filter((section) => section.dayId === dayId);

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
      title={texts.title}
      onClose={onCancel}
      closeDisabled={submitting}
    >
      <div className={styles.modalBody}>
        <p className={styles.counter}>{summary}</p>
        {days.length > 1 && (
          <div className={styles.modalField}>
            <label htmlFor="pickSectionDay">День</label>
            <select
              id="pickSectionDay"
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
            <label htmlFor="pickSectionTarget">Відділення</label>
            <select
              id="pickSectionTarget"
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
        {texts.hint && <p className={styles.counter}>{texts.hint}</p>}
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
            {submitting ? texts.submittingLabel : texts.submitLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
