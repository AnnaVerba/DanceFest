import { LINEUP_MODE } from '../lib/groupApply.constants';

export const GROUP_LINEUP_SETTING_LABEL = 'Реєстрація груп';
export const GROUP_LINEUP_SETTING_HINT =
  'Визначає, що вказує тренер у вкладці «Група» форми заявки.';
export const GROUP_LINEUP_MODE_FIELD_NAME = 'groupLineupMode';

export const GROUP_LINEUP_MODE_DESCRIPTION = {
  [LINEUP_MODE.COUNT]: 'Тренер вказує тільки число, без прізвищ.',
  [LINEUP_MODE.NAMED]: 'Тренер обирає кожного учасника групи.',
} as const;
