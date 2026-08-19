export const NOMINATION_LABEL_SEPARATOR = ' · ';

export interface NominationLabelParts {
  // Назви значень осей у порядку показу: кількість учасників, вік, рівень…
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
 *
 * Дублікат `frontend/src/lib/nominationNaming.ts` — фронт будує ту саму назву
 * в живому перегляді ще до збереження, і збігатись вони мусять посимвольно.
 */
export function buildNominationLabel(parts: NominationLabelParts): string {
  return [...parts.axisNames, parts.specialName, parts.programName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(NOMINATION_LABEL_SEPARATOR);
}
