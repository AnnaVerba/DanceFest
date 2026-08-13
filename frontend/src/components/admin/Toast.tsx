import type { ToastItem } from './useToasts';
import styles from './Toast.module.css';

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
