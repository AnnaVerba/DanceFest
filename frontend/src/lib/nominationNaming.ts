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
 * Порядок частин заданий положенням: спершу осі, далі назва спецкатегорії,
 * і лише потім програма. Тому «Юніори 1 · Перші кроки · Корона Шехеризади»
 * при одному виході й «… · Корона Шехеризади · Табла» при кількох.
 */
export function buildNominationLabel(parts: NominationLabelParts): string {
  return [...parts.axisNames, parts.specialName, parts.programName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(NOMINATION_LABEL_SEPARATOR);
}
