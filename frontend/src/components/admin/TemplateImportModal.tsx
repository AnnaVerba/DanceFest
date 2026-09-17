import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import {
  getCategoryTemplate,
  getCategoryTemplates,
} from '../../lib/categoryTemplates';
import type { CategoryTemplate } from '../../lib/categoryTemplates';
import { createNominationsBulk } from '../../lib/nominations';
import type { Nomination } from '../../lib/nominations';
import { templateNominationsToInputs } from '../../lib/templateNominations';
import {
  TEMPLATE_EMPTY_MESSAGE,
  TEMPLATE_IMPORT_FAILED_MESSAGE,
  TEMPLATE_PICKER_PAGE_SIZE,
  TEMPLATES_LOAD_FAILED_MESSAGE,
} from './TemplateImportModal.constants';
import styles from './EditForm.module.css';

interface TemplateImportModalProps {
  competitionId: string;
  onClose: () => void;
  onImported: (nominations: Nomination[]) => void;
}

// Copies a category template's whole nomination set into a competition.
export default function TemplateImportModal({
  competitionId,
  onClose,
  onImported,
}: TemplateImportModalProps) {
  const [templates, setTemplates] = useState<CategoryTemplate[] | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCategoryTemplates({ pageSize: TEMPLATE_PICKER_PAGE_SIZE })
      .then(({ rows }) => {
        if (cancelled) return;
        setTemplates(rows);
        if (rows.length > 0) setTemplateId(rows[0].id);
      })
      .catch(() => {
        if (!cancelled) setError(TEMPLATES_LOAD_FAILED_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!templateId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const template = await getCategoryTemplate(templateId);
      if (template.nominations.length === 0) {
        setError(TEMPLATE_EMPTY_MESSAGE);
        return;
      }
      const created = await createNominationsBulk(
        competitionId,
        templateNominationsToInputs(template.id, template.nominations),
      );
      onImported(created);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : TEMPLATE_IMPORT_FAILED_MESSAGE,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="Скопіювати номінації із шаблону"
      onClose={onClose}
      closeDisabled={submitting}
    >
      {templates === null && !error && (
        <p className={styles.status}>Завантаження шаблонів...</p>
      )}
      {templates !== null && templates.length === 0 && (
        <p className={styles.hint}>Шаблонів ще немає.</p>
      )}
      {templates !== null && templates.length > 0 && (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="import-template">
              Шаблон номінацій
            </label>
            <select
              id="import-template"
              className={styles.input}
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.nominationsCount})
                </option>
              ))}
            </select>
            <p className={styles.hint}>
              Ціни номінацій після копіювання задайте в списку.
            </p>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Копіювання…' : 'Скопіювати'}
          </button>
        </form>
      )}
      {templates === null && error && <p className={styles.error}>{error}</p>}
    </Modal>
  );
}
