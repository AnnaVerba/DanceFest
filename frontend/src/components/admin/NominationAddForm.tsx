import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AgeRangeFields from '../nominations/AgeRangeFields';
import LineupSizeFields from '../nominations/LineupSizeFields';
import {
  AGE_CATEGORY_TYPE,
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  LINEUP_CATEGORY_TYPE,
} from '../../lib/categories';
import type { Category, CategoryType } from '../../lib/categories';
import type { ExitMode } from '../../lib/categoryTemplates';
import { resolveAxisValue } from '../../lib/axisValue';
import { resolveDraftCategories, signatureOf } from '../../lib/nominationSet';
import { buildNominationLabel } from '../../lib/nominationNaming';
import { createNomination } from '../../lib/nominations';
import type { NominationInput } from '../../lib/nominations';
import { refreshNominations } from '../../lib/nominationsCache';
import { parseDuration } from '../../lib/duration';
import { useCategoryRangeDraft } from '../../lib/useCategoryRangeDraft';
import type { CategoryRangeDraftController } from '../../lib/useCategoryRangeDraft.types';
import { queryKeys } from '../../lib/queryKeys';
import {
  AXIS_ARIA_LABEL_SUFFIX,
  AXIS_REQUIRED_MESSAGE_PREFIX,
  AXIS_SUGGESTIONS_ID_PREFIX,
  EMPTY_AXIS_NAMES,
  NOMINATION_ADD_FAILED_MESSAGE,
  NOMINATION_ADD_LABEL,
  NOMINATION_ADDING_LABEL,
  NOMINATION_DURATION_INVALID_MESSAGE,
  REQUIRED_AXES,
} from './NominationAddForm.constants';
import styles from './NominationsPanel.module.css';

const SINGLE_EXIT: ExitMode = 'single';

interface NominationAddFormProps {
  competitionId: string;
  categories: Category[];
  onError: (message: string) => void;
}

/**
 * Одна звичайна номінація, складена з осей так само, як у конструкторі
 * шаблону: по одному значенню на вісь, назва — з їхніх назв у порядку осей.
 * Значення можна обрати з довідника або ввести нове — воно створиться в
 * довіднику разом із номінацією, і форма заявки побачить його як вісь.
 */
export default function NominationAddForm({
  competitionId,
  categories,
  onError,
}: NominationAddFormProps) {
  const queryClient = useQueryClient();
  const [names, setNames] = useState(EMPTY_AXIS_NAMES);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const age = useCategoryRangeDraft(categories, AGE_CATEGORY_TYPE);
  const lineup = useCategoryRangeDraft(categories, LINEUP_CATEGORY_TYPE);

  const rangeDraftFor = (type: CategoryType): CategoryRangeDraftController | null => {
    if (type === AGE_CATEGORY_TYPE) return age;
    if (type === LINEUP_CATEGORY_TYPE) return lineup;
    return null;
  };

  const createMutation = useMutation({
    mutationFn: (input: NominationInput) => createNomination(competitionId, input),
    onSuccess: () => refreshNominations(queryClient, competitionId),
  });

  const setName = (type: CategoryType, value: string) => {
    setNames((prev) => ({ ...prev, [type]: value }));
    rangeDraftFor(type)?.setName(value);
  };

  const reset = () => {
    setNames(EMPTY_AXIS_NAMES);
    setPrice('');
    setDuration('');
    age.reset();
    lineup.reset();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const missing = REQUIRED_AXES.find((type) => !names[type].trim());
    if (missing) {
      onError(`${AXIS_REQUIRED_MESSAGE_PREFIX} «${CATEGORY_TYPE_LABELS[missing]}».`);
      return;
    }

    const picked: Category[] = [];
    for (const type of CATEGORY_TYPES) {
      if (!names[type].trim()) continue;
      const resolved = resolveAxisValue(names[type], type, categories, rangeDraftFor(type));
      if (!resolved.ok) {
        onError(resolved.message);
        return;
      }
      picked.push(resolved.category);
    }

    const seconds = parseDuration(duration);
    if (duration.trim() !== '' && seconds === null) {
      onError(NOMINATION_DURATION_INVALID_MESSAGE);
      return;
    }

    const name = buildNominationLabel({ axisNames: picked.map((c) => c.name) });
    const categoryIds = picked.map((c) => c.id);

    // Нові значення довідника створюються ще до номінації, тож «зайнято»
    // тримається на весь запит, а не лише на час createMutation.
    setSubmitting(true);
    try {
      const { nominations, idByDraftId } = await resolveDraftCategories(
        [
          {
            signature: signatureOf(categoryIds),
            name,
            price,
            allowsImprovisation: false,
            categoryIds,
            isSpecial: false,
            exitMode: SINGLE_EXIT,
          },
        ],
        picked,
      );
      if (idByDraftId.size > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
      }

      await createMutation.mutateAsync({
        name,
        price: price.trim() === '' ? undefined : Number(price),
        durationLimitSeconds: seconds ?? undefined,
        categoryIds: nominations[0].categoryIds,
      });
      reset();
    } catch {
      onError(NOMINATION_ADD_FAILED_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.add} onSubmit={handleSubmit}>
      {CATEGORY_TYPES.map((type) => {
        const rangeDraft = rangeDraftFor(type);
        const showRange = rangeDraft !== null && names[type].trim() !== '';
        return (
          <div key={type} className={styles.axisField}>
            <input
              className={styles.input}
              type="text"
              list={`${AXIS_SUGGESTIONS_ID_PREFIX}${type}`}
              placeholder={CATEGORY_TYPE_LABELS[type]}
              aria-label={`${CATEGORY_TYPE_LABELS[type]}${AXIS_ARIA_LABEL_SUFFIX}`}
              value={names[type]}
              onChange={(e) => setName(type, e.target.value)}
              required={REQUIRED_AXES.includes(type)}
            />
            <datalist id={`${AXIS_SUGGESTIONS_ID_PREFIX}${type}`}>
              {categories
                .filter((c) => c.type === type)
                .map((category) => (
                  <option key={category.id} value={category.name} />
                ))}
            </datalist>
            {showRange && type === AGE_CATEGORY_TYPE && (
              <div className={styles.axisRange}>
                <AgeRangeFields
                  value={age.draft}
                  onChange={age.setDraft}
                  inputClassName={styles.axisRangeInput}
                  hint={age.hint ?? undefined}
                  hintClassName={styles.axisRangeHint}
                />
              </div>
            )}
            {showRange && type === LINEUP_CATEGORY_TYPE && (
              <div className={styles.axisRange}>
                <LineupSizeFields
                  value={lineup.draft}
                  onChange={lineup.setDraft}
                  inputClassName={styles.axisRangeInput}
                  hint={lineup.hint ?? undefined}
                  hintClassName={styles.axisRangeHint}
                  unboundedClassName={styles.axisRangeUnbounded}
                />
              </div>
            )}
          </div>
        );
      })}
      <input
        className={styles.input}
        type="number"
        min="0"
        step="10"
        placeholder="Ціна, ₴"
        aria-label="Ціна номінації"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <input
        className={styles.input}
        type="text"
        inputMode="numeric"
        placeholder="Тривалість, 2:30"
        aria-label="Тривалість номінації"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <button
        type="submit"
        className={styles.btnPrimary}
        disabled={submitting}
      >
        {submitting ? NOMINATION_ADDING_LABEL : NOMINATION_ADD_LABEL}
      </button>
    </form>
  );
}
