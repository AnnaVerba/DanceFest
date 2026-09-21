export const ENTRY_AMOUNT_CURRENCY = 'грн';
export const ENTRY_AMOUNT_EMPTY_PLACEHOLDER = '—';
// Money is stored as DECIMAL(10,2) — hryvnia with kopiykas. Totals are
// accumulated in whole kopiykas so a sum stays exact instead of picking up
// binary float error; no amount is ever rounded away.
export const KOPIYKAS_PER_HRYVNIA = 100;
