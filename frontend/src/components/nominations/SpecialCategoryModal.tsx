import { useMemo, useState } from 'react';
import Modal from '../admin/Modal';
import {
  CATEGORY_TYPE_LABELS,
  CategoryApiError,
  createCategory,
} from '../../lib/categories';
import type { Category, CategoryType } from '../../lib/categories';
import { buildNominationLabel } from '../../lib/nominationNaming';
import type { ExitMode } from '../../lib/categoryTemplates';
import styles from './SpecialCategoryModal.module.css';

export interface SpecialNominationDraft {
  signature: string;
  name: string;
  price: string;
  allowsImprovisation: boolean;
  categoryIds: string[];
  isSpecial: boolean;
  exitMode: ExitMode;
}

interface SpecialCategoryModalProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onCategoryCreated: (category: Category) => void;
  onSubmit: (nominations: SpecialNominationDraft[]) => void;
}

// Осі, з якими перетинається спецкатегорія. Кількість учасників сюди не
// входить: «Корона» для соло й для групи — це різні спецкатегорії, а не
// один рядок з обома значеннями.
const AXES: CategoryType[] = ['age', 'level'];

function pluralNominations(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'номінація';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'номінації';
  return 'номінацій';
}

export default function SpecialCategoryModal({
  open,
  categories,
  onClose,
  onCategoryCreated,
  onSubmit,
}: SpecialCategoryModalProps) {
  const [specialName, setSpecialName] = useState('');
  const [programs, setPrograms] = useState<Category[]>([]);
  const [picked, setPicked] = useState<Record<string, Category[]>>({
    age: [],
    level: [],
  });
  const [exitMode, setExitMode] = useState<ExitMode>('single');
  const [price, setPrice] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [addingType, setAddingType] = useState<CategoryType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSpecialName('');
    setPrograms([]);
    setPicked({ age: [], level: [] });
    setExitMode('single');
    setPrice('');
    setInputs({});
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const valuesOf = (type: CategoryType): Category[] =>
    type === 'discipline' ? programs : (picked[type] ?? []);

  const setValuesOf = (type: CategoryType, next: Category[]) => {
    if (type === 'discipline') setPrograms(next);
    else setPicked((prev) => ({ ...prev, [type]: next }));
  };

  const addValue = async (type: CategoryType) => {
    const raw = (inputs[type] ?? '').trim();
    if (!raw) return;

    const current = valuesOf(type);
    if (current.some((c) => c.name.trim().toLowerCase() === raw.toLowerCase())) {
      setInputs((prev) => ({ ...prev, [type]: '' }));
      return;
    }

    setAddingType(type);
    setError(null);
    try {
      // Бек поверне наявну категорію, якщо така вже є в спільному довіднику.
      const category = await createCategory(raw, type);
      setValuesOf(type, [...current, category]);
      onCategoryCreated(category);
      setInputs((prev) => ({ ...prev, [type]: '' }));
    } catch (err) {
      setError(
        err instanceof CategoryApiError
          ? err.message
          : 'Не вдалося додати значення категорії.',
      );
    } finally {
      setAddingType(null);
    }
  };

  const removeValue = (type: CategoryType, id: string) =>
    setValuesOf(
      type,
      valuesOf(type).filter((c) => c.id !== id),
    );

  // Живий перегляд: рівно те, що буде створено. Без нього організатор не
  // розуміє, що натворить, доки не збереже.
  const preview = useMemo<SpecialNominationDraft[]>(() => {
    const trimmedName = specialName.trim();
    if (!trimmedName || programs.length === 0) return [];

    const axisCombos = AXES.reduce<Category[][]>(
      (acc, type) => {
        const values = valuesOf(type);
        if (values.length === 0) return acc;
        return acc.flatMap((combo) => values.map((v) => [...combo, v]));
      },
      [[]],
    );

    return axisCombos.flatMap((combo) => {
      const axisNames = combo.map((c) => c.name);
      const axisIds = combo.map((c) => c.id);

      if (exitMode === 'single') {
        return [
          {
            signature: `special|${trimmedName}|${[...axisIds].sort().join(',')}|single`,
            name: buildNominationLabel({ axisNames, specialName: trimmedName }),
            price,
            allowsImprovisation: false,
            categoryIds: [...axisIds, ...programs.map((p) => p.id)],
            isSpecial: true,
            exitMode: 'single' as ExitMode,
          },
        ];
      }

      return programs.map((program) => ({
        signature: `special|${trimmedName}|${[...axisIds].sort().join(',')}|${program.id}`,
        name: buildNominationLabel({
          axisNames,
          specialName: trimmedName,
          programName: program.name,
        }),
        price,
        allowsImprovisation: false,
        categoryIds: [...axisIds, program.id],
        isSpecial: true,
        exitMode: 'per_program' as ExitMode,
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialName, programs, picked, exitMode, price]);

  const handleSubmit = () => {
    if (!specialName.trim()) {
      setError('Вкажіть назву спеціальної категорії.');
      return;
    }
    if (programs.length === 0) {
      setError('Оберіть хоча б одну програму.');
      return;
    }
    if (price.trim() !== '' && !(Number(price) >= 0)) {
      setError('Некоректна ціна.');
      return;
    }
    onSubmit(preview);
    reset();
    onClose();
  };

  const renderPicker = (type: CategoryType, hint: string) => {
    const current = valuesOf(type);
    const options = categories.filter(
      (c) => c.type === type && !current.some((p) => p.id === c.id),
    );
    return (
      <div className={styles.axis} key={type}>
        <div className={styles.axisHead}>
          <strong>{CATEGORY_TYPE_LABELS[type]}</strong>
          <span className={styles.axisHint}>{hint}</span>
        </div>
        {current.length > 0 && (
          <div className={styles.chips}>
            {current.map((category) => (
              <span className={styles.chip} key={category.id}>
                {category.name}
                <button
                  type="button"
                  aria-label={`Прибрати ${category.name}`}
                  onClick={() => removeValue(type, category.id)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <div className={styles.axisAdd}>
          <input
            type="text"
            list={`special-suggestions-${type}`}
            placeholder="Нове значення"
            aria-label={`Значення «${CATEGORY_TYPE_LABELS[type]}»`}
            value={inputs[type] ?? ''}
            onChange={(e) => setInputs((prev) => ({ ...prev, [type]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addValue(type);
              }
            }}
          />
          <datalist id={`special-suggestions-${type}`}>
            {options.map((option) => (
              <option key={option.id} value={option.name} />
            ))}
          </datalist>
          <button
            type="button"
            className={styles.btnSm}
            onClick={() => void addValue(type)}
            disabled={addingType === type}
          >
            {addingType === type ? 'Додаю...' : 'Додати'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} title="Спеціальна категорія" onClose={close}>
      <div className={styles.body}>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label htmlFor="special-name">
            Назва категорії <span className={styles.req}>*</span>
          </label>
          <input
            id="special-name"
            type="text"
            placeholder="Корона Шехеризади"
            value={specialName}
            onChange={(e) => setSpecialName(e.target.value)}
          />
        </div>

        {renderPicker('discipline', 'програми, які входять у категорію')}

        <fieldset className={styles.exit}>
          <legend>Скільки разів учасник виходить на сцену</legend>
          <label className={styles.exitOption}>
            <input
              type="radio"
              name="exitMode"
              checked={exitMode === 'single'}
              onChange={() => setExitMode('single')}
            />
            <span>
              <strong>Один вихід</strong>
              <em>усі програми танцюються підряд, без сходження зі сцени</em>
            </span>
          </label>
          <label className={styles.exitOption}>
            <input
              type="radio"
              name="exitMode"
              checked={exitMode === 'per_program'}
              onChange={() => setExitMode('per_program')}
            />
            <span>
              <strong>Окремий вихід на кожну програму</strong>
              <em>категорія повторюється в програмі стільки разів, скільки програм</em>
            </span>
          </label>
        </fieldset>

        {AXES.map((type) =>
          renderPicker(
            type,
            type === 'age' ? 'з якими віковими групами перетинається' : 'з якими лігами',
          ),
        )}

        <div className={styles.field}>
          <label htmlFor="special-price">Ціна, грн</label>
          <input
            id="special-price"
            type="number"
            min="0"
            step="10"
            placeholder="—"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <strong>Буде створено</strong>
            <span className={styles.count}>
              {preview.length} {pluralNominations(preview.length)}
            </span>
          </div>
          {preview.length === 0 ? (
            <p className={styles.previewEmpty}>
              Вкажіть назву й оберіть хоча б одну програму — тут з'явиться перелік
              номінацій, які буде створено.
            </p>
          ) : (
            <ul className={styles.previewList}>
              {preview.slice(0, 40).map((n) => (
                <li key={n.signature}>{n.name}</li>
              ))}
              {preview.length > 40 && (
                <li className={styles.previewMore}>
                  …і ще {preview.length - 40}
                </li>
              )}
            </ul>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={close}>
            Скасувати
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={preview.length === 0}
          >
            Додати до шаблону
          </button>
        </div>
      </div>
    </Modal>
  );
}
