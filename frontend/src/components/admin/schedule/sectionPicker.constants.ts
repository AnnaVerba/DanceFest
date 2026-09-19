import type { SectionPickerTexts } from './sectionPicker.types';

export const ADD_TO_SECTION_TEXTS: SectionPickerTexts = {
  title: 'Додати у відділення',
  submitLabel: 'Додати',
  submittingLabel: 'Додавання…',
};
export const ADD_TO_SECTION_SUMMARY_PREFIX = 'Виходів до додавання:';

export const MOVE_NOMINATION_TITLE = 'Перенести номінацію';
export const MOVE_NOMINATION_TEXTS: SectionPickerTexts = {
  title: MOVE_NOMINATION_TITLE,
  submitLabel: 'Перенести',
  submittingLabel: 'Перенесення…',
  hint: 'Переносяться всі виходи номінації. Відділення іншого майданчика змінить майданчик номінації.',
};
export const MOVE_NOMINATION_FAILED_MESSAGE = 'Не вдалося перенести номінацію.';
