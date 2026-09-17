import { AWARD_LINE_KIND } from '../../lib/awards.constants';
import type { AwardLineKind } from '../../lib/awards.types';

export const AWARDS_TITLE = 'Нагородна продукція';
export const AWARDS_SUBTITLE =
  'Пораховано з номерів, розставлених у програмі. Будь-яку кількість можна виправити вручну. Блок бачать лише організатори й адміністратори.';
export const MEDAL_STANDINGS_LABEL =
  'Медальний залік — медалі за 1–3 місця розподіляються на всі номери кожної категорії (крім групових і спеціальних)';
export const MEDAL_STANDINGS_HINT =
  'Вимкнено — медалі лише призерам: по одній за 1, 2 і 3 місце (крім ліг, де медаль отримує кожен, — див. нижче). Увімкнено — медаль за місце отримує кожен номер, наприклад 5 номерів → 2 / 2 / 1.';
export const LEAGUES_FROM_TEMPLATE_NOTE =
  'Позначки взято з шаблону категорій конкурсу. Зміна тут стосується лише цього конкурсу — шаблон не змінюється.';
export const LEAGUES_CUSTOMIZED_PREFIX = 'Змінено для цього конкурсу. У шаблоні:';
export const TEMPLATE_HAS_NO_LEAGUES = 'не позначено жодної ліги';
export const RESET_LEAGUES_LABEL = 'Повернути як у шаблоні';
export const LEAGUE_LIST_SEPARATOR = ', ';
export const LOADING_LABEL = 'Рахуємо нагороди…';
export const EMPTY_PROGRAM_LABEL = 'У програмі ще немає номерів.';
export const LOAD_ERROR = 'Не вдалося порахувати нагороди.';
export const SAVE_ERROR = 'Не вдалося зберегти зміну.';
export const PERFORMANCES_LABEL = 'Номерів у програмі';
export const SPECIALS_TITLE = 'Спеціальні номінації';
export const CUP_LABEL_PREFIX = 'Кубок';
export const SAVE_LABEL = 'Зберегти';
export const RESET_LABEL = 'Скинути';
export const CALCULATED_PREFIX = 'розраховано:';

export const AWARD_LINE_LABELS: Record<AwardLineKind, string> = {
  [AWARD_LINE_KIND.FIRST_PLACE_MEDALS]: 'Медалі за 1 місце',
  [AWARD_LINE_KIND.SECOND_PLACE_MEDALS]: 'Медалі за 2 місце',
  [AWARD_LINE_KIND.THIRD_PLACE_MEDALS]: 'Медалі за 3 місце',
  [AWARD_LINE_KIND.PARTICIPATION_MEDALS]: 'Медалі за участь (групи)',
  [AWARD_LINE_KIND.CUPS]: 'Кубки',
  [AWARD_LINE_KIND.DIPLOMAS]: 'Дипломи',
  [AWARD_LINE_KIND.SPECIAL_WINNERS]: '1 місце',
  [AWARD_LINE_KIND.SPECIAL_PARTICIPATIONS]: 'Участей',
};
