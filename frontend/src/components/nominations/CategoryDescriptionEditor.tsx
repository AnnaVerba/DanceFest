import { useState } from 'react';
import {
  CategoryApiError,
  updateCategoryDescription,
} from '../../lib/categories';
import type { Category } from '../../lib/categories';
import { isDraftCategory } from '../../lib/nominationSet';
import {
  DESCRIPTION_CANCEL_LABEL,
  DESCRIPTION_EDIT_LABEL,
  DESCRIPTION_HINT,
  DESCRIPTION_PLACEHOLDER,
  DESCRIPTION_ROWS,
  DESCRIPTION_SAVE_FAILED_MESSAGE,
  DESCRIPTION_SAVE_LABEL,
  DESCRIPTION_SAVING_LABEL,
  MAX_CATEGORY_DESCRIPTION_LENGTH,
} from './CategoryDescriptionEditor.constants';
import styles from './CategoryDescriptionEditor.module.css';

interface CategoryDescriptionEditorProps {
  category: Category;
  buttonClassName: string;
  onSaved: (updated: Category) => void;
  onCancel: () => void;
}

// Опис значення зі спільного довідника зберігається одразу на сервері (як і
// межі віку); у чернетки він їде разом зі створенням при збереженні набору.
export default function CategoryDescriptionEditor({
  category,
  buttonClassName,
  onSaved,
  onCancel,
}: CategoryDescriptionEditorProps) {
  const [value, setValue] = useState(category.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const description = value.trim() || null;
    if (isDraftCategory(category.id)) {
      onSaved({ ...category, description });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      onSaved(await updateCategoryDescription(category.id, description));
    } catch (err) {
      setError(
        err instanceof CategoryApiError
          ? err.message
          : DESCRIPTION_SAVE_FAILED_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.editor}>
      <label className={styles.label}>
        {DESCRIPTION_EDIT_LABEL}: «{category.name}»
      </label>
      <textarea
        className={styles.textarea}
        rows={DESCRIPTION_ROWS}
        maxLength={MAX_CATEGORY_DESCRIPTION_LENGTH}
        placeholder={DESCRIPTION_PLACEHOLDER}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p className={styles.hint}>{DESCRIPTION_HINT}</p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonClassName}
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? DESCRIPTION_SAVING_LABEL : DESCRIPTION_SAVE_LABEL}
        </button>
        <button
          type="button"
          className={buttonClassName}
          disabled={saving}
          onClick={onCancel}
        >
          {DESCRIPTION_CANCEL_LABEL}
        </button>
      </div>
    </div>
  );
}
