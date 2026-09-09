import { useEffect, useState } from 'react';
import Modal from '../Modal';
import styles from './Schedule.module.css';

export interface GroupOption {
  key: string;
  label: string;
}

interface MergeGroupsModalProps {
  open: boolean;
  groups: GroupOption[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (groupKeys: string[], label: string) => void;
}

const JUDGING_NOTE =
  'Об’єднання діє лише в програмі цього конкурсу. Судять і рахують результати далі по вихідних категоріях.';

export default function MergeGroupsModal({
  open,
  groups,
  submitting,
  onCancel,
  onSubmit,
}: MergeGroupsModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (open) {
      setSelected([]);
      setLabel('');
    }
  }, [open]);

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const valid = selected.length >= 2 && label.trim().length > 0;

  return (
    <Modal
      open={open}
      title="Об’єднати групи номінацій"
      onClose={onCancel}
      closeDisabled={submitting}
    >
      <div className={styles.modalBody}>
        {groups.map((group) => (
          <label key={group.key} className={styles.checkRow}>
            <input
              type="checkbox"
              checked={selected.includes(group.key)}
              onChange={() => toggle(group.key)}
              disabled={submitting}
            />
            {group.label}
          </label>
        ))}
        <div className={styles.modalField}>
          <label htmlFor="mergeLabel">Спільна назва</label>
          <input
            id="mergeLabel"
            className={styles.input}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Юніори 1 + Юніори 2"
            disabled={submitting}
          />
        </div>
        <p className={styles.warnText}>{JUDGING_NOTE}</p>
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
            onClick={() => onSubmit(selected, label.trim())}
          >
            Об’єднати
          </button>
        </div>
      </div>
    </Modal>
  );
}
