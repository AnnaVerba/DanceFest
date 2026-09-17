import {
  CATEGORY_IDS_SEPARATOR,
  SPECIAL_NAME_KEY_SEPARATOR,
} from './awards.constants';

// A competition nomination generated from a template keeps its templateId
// and the template nomination's categoryIds — that pair finds the template
// special category and its bare `specialName`, which the competition
// nomination itself does not store. Names are not used: the organizer may
// rename a nomination in the wizard.
export function specialNameKey(
  templateId: string,
  categoryIds: string[],
): string {
  return `${templateId}${SPECIAL_NAME_KEY_SEPARATOR}${[...categoryIds]
    .sort()
    .join(CATEGORY_IDS_SEPARATOR)}`;
}
