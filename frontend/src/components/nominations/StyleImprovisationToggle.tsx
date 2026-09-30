import { useState } from 'react';
import {
  CategoryApiError,
  updateCategoryImprovisation,
} from '../../lib/categories';
import type { Category } from '../../lib/categories';
import {
  IMPROVISATION_TOGGLE_FAILED_MESSAGE,
  IMPROVISATION_TOGGLE_HINT,
  IMPROVISATION_TOGGLE_LABEL,
  IMPROVISATION_TOGGLE_OFF_TEXT,
  IMPROVISATION_TOGGLE_ON_TEXT,
} from './StyleImprovisationToggle.constants';

interface StyleImprovisationToggleProps {
  category: Category;
  onSaved: (updated: Category) => void;
  onError: (message: string) => void;
}

// Ознака імпровізації стилю зі спільного довідника зберігається одразу на
// сервері (як і опис) і діє в усіх конкурсах.
export default function StyleImprovisationToggle({
  category,
  onSaved,
  onError,
}: StyleImprovisationToggleProps) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      onSaved(
        await updateCategoryImprovisation(
          category.id,
          !category.isImprovisation,
        ),
      );
    } catch (err) {
      onError(
        err instanceof CategoryApiError
          ? err.message
          : IMPROVISATION_TOGGLE_FAILED_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={category.isImprovisation}
      aria-label={`${IMPROVISATION_TOGGLE_LABEL}: ${category.name}`}
      title={IMPROVISATION_TOGGLE_HINT}
      disabled={saving}
      onClick={() => void toggle()}
    >
      {category.isImprovisation
        ? IMPROVISATION_TOGGLE_ON_TEXT
        : IMPROVISATION_TOGGLE_OFF_TEXT}
    </button>
  );
}
