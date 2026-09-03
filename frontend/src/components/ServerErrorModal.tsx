import { useEffect, useState } from 'react';
import Modal from './admin/Modal';
import { registerServerErrorListener } from '../lib/serverError';
import type { ServerErrorListener } from '../lib/serverError';
import {
  SERVER_ERROR_MODAL_TITLE,
  SERVER_ERROR_MODAL_MESSAGE,
  SERVER_ERROR_MODAL_CLOSE_LABEL,
} from '../lib/serverError.constants';
import styles from './ServerErrorModal.module.css';

// Mounted once at the app root (App.tsx). Every 5xx response, from any page
// or role, reports through lib/serverError.ts and pops this same modal.
export default function ServerErrorModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const listener: ServerErrorListener = {
      onServerError: () => setOpen(true),
    };
    registerServerErrorListener(listener);
    return () => registerServerErrorListener(null);
  }, []);

  const handleClose = () => setOpen(false);

  return (
    <Modal open={open} title={SERVER_ERROR_MODAL_TITLE} onClose={handleClose}>
      <div className={styles.icon} aria-hidden="true">
        !
      </div>
      <p className={styles.text}>{SERVER_ERROR_MODAL_MESSAGE}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.close} onClick={handleClose}>
          {SERVER_ERROR_MODAL_CLOSE_LABEL}
        </button>
      </div>
    </Modal>
  );
}
