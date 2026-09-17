import type { TemplateNomination } from './categoryTemplates';
import type { NominationInput } from './nominations';

// A template's nominations as competition nominations, still linked to the
// template they came from. Prices are set per competition, so none is sent.
export function templateNominationsToInputs(
  templateId: string,
  nominations: TemplateNomination[],
): NominationInput[] {
  return nominations.map((n) => ({
    templateId,
    name: n.name,
    allowsImprovisation: n.allowsImprovisation,
    categoryIds: n.categoryIds,
    isSpecial: n.isSpecial,
    exitMode: n.exitMode,
  }));
}
