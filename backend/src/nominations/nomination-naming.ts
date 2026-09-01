export const NOMINATION_LABEL_SEPARATOR = ' · ';

export interface NominationLabelParts {
  axisNames: string[];
  specialName?: string | null;
  programName?: string | null;
}

export function buildNominationLabel(parts: NominationLabelParts): string {
  return [parts.specialName, ...parts.axisNames, parts.programName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(NOMINATION_LABEL_SEPARATOR);
}
