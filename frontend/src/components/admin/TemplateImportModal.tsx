import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import {
  getCategoryTemplate,
  getCategoryTemplates,
} from '../../lib/categoryTemplates';
import type { CategoryTemplate } from '../../lib/categoryTemplates';
import {
  createNominationsBulk,
  NominationsBulkPartialFailureError,
} from '../../lib/nominations';
import type { Nomination, NominationInput } from '../../lib/nominations';
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
  // Set only after a batch partially fails: holds what's left to send, so
  // retrying doesn't resend the whole template and duplicate what already
  // landed in the earlier, successful batches.
  const [pendingNominations, setPendingNominations] = useState<
    NominationInput[] | null
  >(null);

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

  useEffect(() => {
    setPendingNominations(null);
    setError(null);
  }, [templateId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!templateId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let toSend = pendingNominations;
      if (!toSend) {
        const template = await getCategoryTemplate(templateId);
        if (template.nominations.length === 0) {
          setError(TEMPLATE_EMPTY_MESSAGE);
          return;
        }
        toSend = templateNominationsToInputs(template.id, template.nominations);
      }
      const created = await createNominationsBulk(competitionId, toSend);
      setPendingNominations(null);
      onImported(created);
    } catch (err) {
      if (err instanceof NominationsBulkPartialFailureError) {
        setPendingNominations(err.unsaved);
        setError(
          `${err.message} Збережено ${err.created.length} із ${err.created.length + err.unsaved.length} — натисніть ще раз, щоб дозберегти решту.`,
        );
      } else {
        setPendingNominations(null);
        setError(
          err instanceof Error ? err.message : TEMPLATE_IMPORT_FAILED_MESSAGE,
        );
      }
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
              Номінації, які вже є в конкурсі, пропускаються. Ціни приїдуть
              із шаблону — за потреби змініть їх у списку номінацій.
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
