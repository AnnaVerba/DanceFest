export const NOMINATION_LABEL_SEPARATOR = ' · ';

export interface NominationLabelParts {
  // Назви значень осей у порядку показу: вік, рівень, кількість учасників…
  axisNames: string[];
  // Заповнено лише для спеціальних категорій: «Корона Шехеризади».
  specialName?: string | null;
  // Заповнено лише коли спецкатегорія дає окремий вихід на кожну програму.
  programName?: string | null;
}

/**
 * Назва спецкатегорії йде першою: у розкладі й на нагородженні «Корона
 * Шехеризади» — це те, що називають уголос, а осі лише уточнюють, чия саме
 * корона. Далі осі, і останньою програма: «Корона Шехеризади · Юніори 1 ·
 * Перші кроки · Табла».
 */
export function buildNominationLabel(parts: NominationLabelParts): string {
  return [parts.specialName, ...parts.axisNames, parts.programName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(NOMINATION_LABEL_SEPARATOR);
}
