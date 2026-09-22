import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import AxisPricesModal from '../nominations/AxisPricesModal';
import type { Category } from '../../lib/categories';
import type { AxisPriceMap } from '../../lib/nominationPricing';
import {
  axisPriceInputs,
  axisPricesFromRows,
} from '../../lib/nominationAxisPrices';
import { getAxisPrices, setAxisPricesBulk } from '../../lib/nominations';
import type { AxisPriceInput, AxisPriceRow } from '../../lib/nominations.types';
import { pluralNominations } from '../../lib/nominationSet';
import { refreshNominations } from '../../lib/nominationsCache';
import { queryKeys } from '../../lib/queryKeys';
import {
  AXIS_PRICES_APPLIED_PREFIX,
  AXIS_PRICES_APPLY_LABEL,
  AXIS_PRICES_BUTTON_LABEL,
  AXIS_PRICES_CONFIRM_LABEL,
  AXIS_PRICES_CONFIRM_TEMPLATE,
  AXIS_PRICES_CONFIRM_TITLE,
  AXIS_PRICES_CONFIRM_VALUES_PLACEHOLDER,
  AXIS_PRICES_COUNT_SEPARATOR,
  AXIS_PRICES_LOAD_ERROR_MESSAGE,
  AXIS_PRICES_MIXED_NOTE,
  AXIS_PRICES_NOTE_SEPARATOR,
  AXIS_PRICES_NOTHING_CHANGED_MESSAGE,
  AXIS_PRICES_NOTHING_TO_APPLY_MESSAGE,
  AXIS_PRICES_SAVE_ERROR_MESSAGE,
} from './NominationAxisPrices.constants';
import panelStyles from './NominationsPanel.module.css';

const EMPTY_ROWS: AxisPriceRow[] = [];

interface NominationAxisPricesProps {
  competitionId: string;
  // Довідник категорій панелі: рядки цін несуть лише id, а поля показують
  // значення осі цілком.
  categories: Category[];
  onNotice: (message: string) => void;
}

/**
 * Ціни за значеннями складу й ліги в межах одного конкурсу. Кнопка відкриває
 * ту саму модалку, що й конструктор набору, тільки підтвердження тут б'є по
 * номінаціях конкурсу — шаблон, з якого їх скопійовано, не змінюється.
 */
export default function NominationAxisPrices({
  competitionId,
  categories,
  onNotice,
}: NominationAxisPricesProps) {
  const queryClient = useQueryClient();
  const [prices, setPrices] = useState<AxisPriceMap>({});
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<AxisPriceInput[] | null>(null);

  const rowsQuery = useQuery({
    queryKey: queryKeys.nominationAxisPrices(competitionId),
    queryFn: () => getAxisPrices(competitionId),
  });
  const rows = rowsQuery.data ?? EMPTY_ROWS;

  // Модалка показує те, що номінації коштують зараз, тож після кожного
  // оновлення списку ціни перечитуються з нього.
  useEffect(() => {
    if (rowsQuery.data) setPrices(axisPricesFromRows(rowsQuery.data));
  }, [rowsQuery.data]);

  useEffect(() => {
    if (rowsQuery.isError) onNotice(AXIS_PRICES_LOAD_ERROR_MESSAGE);
  }, [rowsQuery.isError, onNotice]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const category of categories) map.set(category.id, category);
    return map;
  }, [categories]);

  // Лише ті значення осей, що реально трапляються в номінаціях конкурсу.
  const pricedCategories = useMemo(
    () =>
      rows
        .map((row) => categoryById.get(row.categoryId))
        .filter((category): category is Category => category !== undefined),
    [rows, categoryById],
  );

  const notes = useMemo(() => {
    const byCategoryId: Record<string, string> = {};
    for (const row of rows) {
      const count = `${row.nominationCount} ${pluralNominations(row.nominationCount)}`;
      byCategoryId[row.categoryId] =
        row.price === null
          ? `${count}${AXIS_PRICES_NOTE_SEPARATOR}${AXIS_PRICES_MIXED_NOTE}`
          : count;
    }
    return byCategoryId;
  }, [rows]);

  const applyMutation = useMutation({
    mutationFn: (inputs: AxisPriceInput[]) =>
      setAxisPricesBulk(competitionId, inputs),
    onSuccess: (result) => {
      setPending(null);
      refreshNominations(queryClient, competitionId);
      onNotice(
        result.updated === 0
          ? AXIS_PRICES_NOTHING_CHANGED_MESSAGE
          : `${AXIS_PRICES_APPLIED_PREFIX} ${result.updated}`,
      );
    },
    onError: (err: unknown) => {
      setPending(null);
      onNotice(
        err instanceof Error ? err.message : AXIS_PRICES_SAVE_ERROR_MESSAGE,
      );
    },
  });

  // Модалка вже перевірила самі ціни — лишилося не питати підтвердження,
  // коли застосовувати нема чого.
  const handleSubmit = (next: AxisPriceMap) => {
    setPrices(next);
    const inputs = axisPriceInputs(next);
    if (inputs.length === 0) {
      onNotice(AXIS_PRICES_NOTHING_TO_APPLY_MESSAGE);
      return;
    }
    setOpen(false);
    setPending(inputs);
  };

  if (pricedCategories.length === 0) return null;

  const count = axisPriceInputs(prices).length;

  return (
    <>
      <button
        type="button"
        className={panelStyles.btnSecondary}
        onClick={() => setOpen(true)}
      >
        {AXIS_PRICES_BUTTON_LABEL}
        {count > 0 && `${AXIS_PRICES_COUNT_SEPARATOR}${count}`}
      </button>

      {open && (
        <AxisPricesModal
          categories={pricedCategories}
          prices={prices}
          notes={notes}
          submitLabel={AXIS_PRICES_APPLY_LABEL}
          submitting={applyMutation.isPending}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title={AXIS_PRICES_CONFIRM_TITLE}
        description={AXIS_PRICES_CONFIRM_TEMPLATE.replace(
          AXIS_PRICES_CONFIRM_VALUES_PLACEHOLDER,
          String(pending?.length ?? 0),
        )}
        confirmLabel={AXIS_PRICES_CONFIRM_LABEL}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          // Помилку показує onError мутації — тут вона лише не має спливати
          // з діалогу.
          await applyMutation.mutateAsync(pending).catch(() => undefined);
        }}
      />
    </>
  );
}
