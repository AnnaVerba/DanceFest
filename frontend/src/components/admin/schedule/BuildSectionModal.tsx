import { useEffect, useState } from 'react';
import Modal from '../Modal';
import { parseClock } from '../../../lib/duration';
import type { CompetitionDay } from '../../../lib/schedule';
import styles from './Schedule.module.css';

interface BuildSectionModalProps {
  open: boolean;
  defaultName: string;
  exitCount: number;
  days: CompetitionDay[];
  defaultDayId: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (name: string, startTime: string, dayId: string) => void;
}

export default function BuildSectionModal({
  open,
  defaultName,
  exitCount,
  days,
  defaultDayId,
  submitting,
  onCancel,
  onSubmit,
}: BuildSectionModalProps) {
  const [name, setName] = useState(defaultName);
  const [startTime, setStartTime] = useState('09:00');
  const [dayId, setDayId] = useState(defaultDayId || days[0]?.id || '');

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setStartTime('09:00');
      setDayId(defaultDayId || days[0]?.id || '');
    }
  }, [open, defaultName, defaultDayId, days]);

  const valid =
    name.trim().length > 0 && parseClock(startTime) !== null && dayId !== '';

  return (
    <Modal
      open={open}
      title="Сформувати відділення"
      onClose={onCancel}
      closeDisabled={submitting}
    >
      <div className={styles.modalBody}>
        <p className={styles.counter}>Виходів у відділенні: {exitCount}</p>
        {days.length > 1 && (
          <div className={styles.modalField}>
            <label htmlFor="sectionDay">День</label>
            <select
              id="sectionDay"
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
        <div className={styles.modalField}>
          <label htmlFor="sectionName">Назва відділення</label>
          <input
            id="sectionName"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className={styles.modalField}>
          <label htmlFor="sectionStart">Час початку (ГГ:ХХ)</label>
          <input
            id="sectionStart"
            className={styles.input}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="09:00"
            disabled={submitting}
          />
        </div>
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
            disabled={!valid || submitting}
            onClick={() => onSubmit(name.trim(), startTime.trim(), dayId)}
          >
            {submitting ? 'Формування…' : 'Сформувати'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
