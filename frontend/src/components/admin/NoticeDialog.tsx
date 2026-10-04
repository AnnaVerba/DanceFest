import Modal from './Modal';
import { NOTICE_DIALOG_OK_LABEL } from './NoticeDialog.constants';
import styles from './ConfirmDialog.module.css';

interface NoticeDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

// A message the user only acknowledges — ConfirmDialog without a choice.
export default function NoticeDialog({
  open,
  title,
  message,
  onClose,
}: NoticeDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className={styles.text}>{message}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.confirm} onClick={onClose}>
          {NOTICE_DIALOG_OK_LABEL}
        </button>
      </div>
    </Modal>
  );
}
