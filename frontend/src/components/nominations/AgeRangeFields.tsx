import { MIN_AGE_BOUND } from '../../lib/ageRange';
import type { AgeRangeDraft } from '../../lib/ageRange';

interface AgeRangeFieldsProps {
  value: AgeRangeDraft;
  onChange: (next: AgeRangeDraft) => void;
  // Клас приходить ззовні: майстер і модалка мають власні CSS-модулі, а поля
  // мусять лишатись вузькими в обох.
  inputClassName?: string;
  // Звідки взялись числа в полях. Клас — з тієї ж причини, що й inputClassName.
  hint?: string;
  hintClassName?: string;
}

export default function AgeRangeFields({
  value,
  onChange,
  inputClassName,
  hint,
  hintClassName,
}: AgeRangeFieldsProps) {
  return (
    <>
      <input
        type="number"
        className={inputClassName}
        min={MIN_AGE_BOUND}
        placeholder="від"
        aria-label="Вік від"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <input
        type="number"
        className={inputClassName}
        min={MIN_AGE_BOUND}
        placeholder="до"
        aria-label="Вік до"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
      {hint && <span className={hintClassName}>{hint}</span>}
    </>
  );
}
