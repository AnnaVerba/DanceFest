import { axisPriceKey } from '../../lib/nominationPricing';
import type { AxisPriceMap } from '../../lib/nominationPricing';
import type { Category } from '../../lib/categories';
import styles from './AxisPriceInputs.module.css';

interface AxisPriceInputsProps {
  // Already filtered to the priced axes (lineup, level) and deduplicated.
  categories: Category[];
  prices: AxisPriceMap;
  onChange: (next: AxisPriceMap) => void;
}

// One price field per league/lineup value — the only place price is typed
// in. A nomination's price is derived from these, never edited on its own
// row (склад always outranks ліга — see lib/nominationPricing.ts).
export default function AxisPriceInputs({
  categories,
  prices,
  onChange,
}: AxisPriceInputsProps) {
  if (categories.length === 0) return null;

  return (
    <div className={styles.axisPrices}>
      {categories.map((category) => (
        <label className={styles.axisPrice} key={category.id}>
          <span>{category.name}</span>
          <input
            type="number"
            min={0}
            placeholder="ціна"
            aria-label={`Ціна за «${category.name}»`}
            value={prices[axisPriceKey(category.type, category.id)] ?? ''}
            onChange={(e) =>
              onChange({
                ...prices,
                [axisPriceKey(category.type, category.id)]: e.target.value,
              })
            }
          />
        </label>
      ))}
    </div>
  );
}
