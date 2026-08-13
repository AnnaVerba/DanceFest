import { useState } from 'react';
import Modal from './Modal';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={onCancel} closeDisabled={pending}>
      <p className={styles.text}>{description}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancel}
          onClick={onCancel}
          disabled={pending}
        >
          Скасувати
        </button>
        <button
          type="button"
          className={styles.confirm}
          onClick={handleConfirm}
          disabled={pending}
        >
          {pending ? 'Зачекайте…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
