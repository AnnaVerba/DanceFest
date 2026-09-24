export const USER_NOT_FOUND_MESSAGE = 'Користувача не знайдено';
export const WRONG_PASSWORD_FOR_EXISTING_ACCOUNT_MESSAGE =
  'Акаунт із таким email або телефоном уже існує — вкажіть правильний пароль';
export const LEVEL_ONLY_GOES_UP_MESSAGE =
  'Рівень доступу можна лише підвищувати';
export const LEVEL_NOT_SELF_UPGRADABLE_MESSAGE =
  'Цей рівень доступу може надати лише адміністратор';
export const SCHOOL_REQUIRED_FOR_COACH_MESSAGE =
  'Щоб стати тренером, оберіть або створіть школу';
export const ONLY_COACH_SELF_UPGRADE_MESSAGE =
  'Самостійно можна отримати лише рівень тренера';
export const MENTOR_COACH_NOT_FOUND_MESSAGE = 'Вказаного тренера не знайдено';
export const MENTOR_COACH_ONE_OF_MESSAGE =
  'Вкажіть або наявного тренера, або дані нового — але не обидва';
export const MENTOR_COACH_REQUIRED_MESSAGE = 'Вкажіть тренера';
export const SCHOOL_ONLY_FOR_COACH_MESSAGE = 'Школу може вказати лише тренер';
export const USER_CONTACT_TAKEN_MESSAGE =
  'Цей телефон або email уже використовує інший користувач';
export const PARTICIPANT_PHONE_TAKEN_MESSAGE =
  'Учасник із таким номером телефону вже існує';
export const NOT_YOUR_ROSTER_MESSAGE = 'Цей учасник не у вашому списку';
export const DEFAULT_USERS_PAGE_SIZE = 25;
export const MAX_USERS_PAGE_SIZE = 100;
export const CANNOT_DELETE_SELF_MESSAGE =
  'Свій власний акаунт видалити не можна';
// A deleted user's phone and email get this plus their id appended, which
// frees the originals for a fresh registration and keeps every renamed value
// unique. To restore an account, cut the value back at the suffix.
export const DELETED_CONTACT_SUFFIX = '_deleted';
