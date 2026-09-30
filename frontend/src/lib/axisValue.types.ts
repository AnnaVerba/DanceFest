import type { Category } from './categories';

// Значення осі, введене назвою: або наявне в довіднику, або чернетка
// (draftCategory), яку ще треба створити на сервері.
export type AxisValueResult =
  | { ok: true; category: Category }
  | { ok: false; message: string };
