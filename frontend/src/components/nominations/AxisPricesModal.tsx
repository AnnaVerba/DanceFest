import { useMemo, useState } from 'react';
import Modal from '../admin/Modal';
import AxisPriceInputs from './AxisPriceInputs';
import { CATEGORY_TYPE_LABELS } from '../../lib/categories';
import type { Category } from '../../lib/categories';
import { PRICED_AXES } from '../../lib/nominationPricing';
import type { AxisPriceMap } from '../../lib/nominationPricing';
import { findInvalidAxisPriceMessage } from '../../lib/templateCategoryPrices';
import {
  AXIS_PRICES_CANCEL_LABEL,
  AXIS_PRICES_EMPTY_MESSAGE,
  AXIS_PRICES_MODAL_TITLE,
  AXIS_PRICES_PRIORITY_HINT,
} from './AxisPricesModal.constants';
import styles from './AxisPricesModal.module.css';

interface AxisPricesModalProps {
  // Значення осей, на яких задається ціна. Модалка сама розкладає їх за
  // віссю, у тому ж порядку, у якому осі перебивають одна одну.
  categories: Category[];
  prices: AxisPriceMap;
  // Підпис під полем: скільки номінацій зачіпає значення, чи ціни різні.
  notes?: Record<string, string>;
  submitLabel: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (next: AxisPriceMap) => void;
}

/**
 * Ціни за складом і лігою в одному місці. Модалка тримає власну чернетку:
 * «Скасувати» лишає ціни, з якими її відкрили, і лише кнопка підтвердження
 * віддає їх тому, хто її відкрив — конструктору набору чи панелі конкурсу.
 *
 * Її монтують за потреби (`{open && <AxisPricesModal ... />}`), тож чернетка
 * заводиться наново з кожним відкриттям.
 */
export default function AxisPricesModal({
  categories,
  prices,
  notes,
  submitLabel,
  submitting = false,
  onClose,
  onSubmit,
}: AxisPricesModalProps) {
  const [draft, setDraft] = useState<AxisPriceMap>(prices);
  const [error, setError] = useState<string | null>(null);

  const axes = useMemo(
    () =>
      PRICED_AXES.map((type) => ({
        type,
        values: categories.filter((category) => category.type === type),
      })).filter((axis) => axis.values.length > 0),
    [categories],
  );

  const handleSubmit = () => {
    const invalid = findInvalidAxisPriceMessage(draft, categories);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    onSubmit(draft);
  };

  const handleChange = (next: AxisPriceMap) => {
    setError(null);
    setDraft(next);
  };

  return (
    <Modal
      open
      title={AXIS_PRICES_MODAL_TITLE}
      onClose={onClose}
      closeDisabled={submitting}
    >
      {axes.length === 0 ? (
        <p className={styles.empty}>{AXIS_PRICES_EMPTY_MESSAGE}</p>
      ) : (
        <>
          <p className={styles.hint}>{AXIS_PRICES_PRIORITY_HINT}</p>
          {axes.map((axis) => (
            <div className={styles.axis} key={axis.type}>
              <p className={styles.axisTitle}>
                {CATEGORY_TYPE_LABELS[axis.type]}
              </p>
              <AxisPriceInputs
                categories={axis.values}
                prices={draft}
                notes={notes}
                onChange={handleChange}
              />
            </div>
          ))}
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btn}
          onClick={onClose}
          disabled={submitting}
        >
          {AXIS_PRICES_CANCEL_LABEL}
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleSubmit}
          disabled={submitting || axes.length === 0}
        >
          {submitLabel}
        </button>
      </div>
    </Modal>
  );
}
