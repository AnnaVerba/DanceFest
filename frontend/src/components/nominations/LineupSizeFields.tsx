import { MIN_LINEUP_SIZE } from '../../lib/categoryRange';
import type { CategoryRangeDraft } from '../../lib/categoryRange';
import { LINEUP_SIZE_UNBOUNDED_LABEL } from '../../lib/categoryRange.constants';

interface LineupSizeFieldsProps {
  value: CategoryRangeDraft;
  onChange: (next: CategoryRangeDraft) => void;
  // Клас приходить ззовні: майстер і модалка мають власні CSS-модулі, а поля
  // мусять лишатись вузькими в обох.
  inputClassName?: string;
  hint?: string;
  hintClassName?: string;
  unboundedClassName?: string;
}

/**
 * Кількість людей у складі. «До» можна лишити порожнім — тоді склад рівно на
 * стільки людей, скільки в «від» (Дуо — двоє). Для складу без верхньої межі
 * (Група — троє й більше) є окремий прапорець: порожнє поле й відсутність
 * межі — різні речі, і плутати їх не можна.
 */
export default function LineupSizeFields({
  value,
  onChange,
  inputClassName,
  hint,
  hintClassName,
  unboundedClassName,
}: LineupSizeFieldsProps) {
  return (
    <>
      <input
        type="number"
        className={inputClassName}
        min={MIN_LINEUP_SIZE}
        placeholder="від"
        aria-label="Людей від"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <input
        type="number"
        className={inputClassName}
        min={MIN_LINEUP_SIZE}
        placeholder="до"
        aria-label="Людей до"
        value={value.unbounded ? '' : value.to}
        disabled={value.unbounded}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
      <label className={unboundedClassName}>
        <input
          type="checkbox"
          checked={value.unbounded}
          onChange={(e) => onChange({ ...value, unbounded: e.target.checked })}
        />
        <span>{LINEUP_SIZE_UNBOUNDED_LABEL}</span>
      </label>
      {hint && <span className={hintClassName}>{hint}</span>}
    </>
  );
}
