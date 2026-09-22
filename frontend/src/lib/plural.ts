// Ukrainian plural forms: [one, few, many] — 1 заявка, 2 заявки, 5 заявок.
export type PluralForms = readonly [string, string, string];

export function pickPluralForm(count: number, forms: PluralForms): string {
  const d10 = count % 10;
  const d100 = count % 100;
  if (d10 === 1 && d100 !== 11) return forms[0];
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return forms[1];
  return forms[2];
}
