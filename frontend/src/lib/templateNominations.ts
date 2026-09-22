import type { TemplateNomination } from './categoryTemplates';
import type { NominationInput } from './nominations';

// A template's nominations as competition nominations, still linked to the
// template they came from. The price that travels is the effective one — the
// row's own price, or the lineup/league price when the row has none. The
// competition then owns that number: later template edits never reach it.
export function templateNominationsToInputs(
  templateId: string,
  nominations: TemplateNomination[],
): NominationInput[] {
  return nominations.map((n) => ({
    templateId,
    name: n.name,
    price: n.effectivePrice ?? undefined,
    allowsImprovisation: n.allowsImprovisation,
    categoryIds: n.categoryIds,
    isSpecial: n.isSpecial,
    specialName: n.specialName ?? undefined,
    exitMode: n.exitMode,
  }));
}
