/**
 * Ukrainian UI strings the tests assert against, copied verbatim from the frontend
 * (frontend/src/pages/*, frontend/src/lib/auth.constants.ts) so a copy change breaks
 * exactly one constant instead of every test that reads it.
 */
export const UI_TEXT = {
  home: {
    HEADING: 'Конкурси східного танцю',
    NO_RESULTS: 'За цими умовами конкурсів не знайдено.',
  },
  login: {
    HEADING: 'Вхід',
    SUBMIT_IDLE: 'Увійти',
    SUBMIT_PENDING: 'Вхід...',
    INVALID_CREDENTIALS: 'Невірний email, пароль або роль',
  },
  register: {
    HEADING: 'Реєстрація',
    SUBMIT_IDLE: 'Зареєструватися',
    SUBMIT_PENDING: 'Реєстрація...',
    PASSWORD_MISMATCH: 'Паролі не збігаються',
  },
  dashboard: {
    HEADING: 'Конкурси',
    NEW_COMPETITION_LINK: 'Новий конкурс',
    NO_RESULTS: 'Нічого не знайдено',
    LOGOUT_BUTTON: 'Вийти',
  },
  publicCompetition: {
    APPLY_LINK: 'Подати заявку',
    BACK_LINK: 'До всіх конкурсів',
  },
  cabinets: {
    PARTICIPANT_EYEBROW: 'Кабінет учасника',
    COACH_EYEBROW: 'Кабінет тренера',
    NO_OPEN_COMPETITIONS: 'Зараз немає конкурсів з відкритою реєстрацією.',
    COACH_TAB_COMPETITIONS: 'Конкурси',
    COACH_TAB_PARTICIPANTS: 'Мої учасники',
    ADD_PARTICIPANT_BUTTON: 'Додати учасника',
    NO_PARTICIPANTS: 'Ви ще не додали жодного учасника.',
  },
  categoryTemplateForm: {
    HEADING: 'Новий шаблон',
    SUBMIT: 'Створити шаблон',
    // Backend 500s currently pass Nest's default error body straight through
    // (see backend/src/category-templates response on BUG-2), so the frontend
    // surfaces this literal English message rather than a translated one.
    SERVER_ERROR_500: 'Internal server error',
  },
  wizard: {
    HEADING: 'Новий конкурс',
    NEXT: 'Далі',
    SUBMIT: 'Створити конкурс',
    FIELD_ERROR_BANNER: 'Перевірте позначені поля.',
    NAME_REQUIRED: 'Вкажіть назву конкурсу.',
  },
  competitionDetail: {
    TAB_DETAILS: 'Деталі',
    TAB_NOMINATIONS: 'Номінації',
    TAB_VENUES: 'Майданчики',
    TAB_ENTRIES: 'Заявки',
    EDIT_LINK: 'Редагувати',
    DELETE_BUTTON: 'Видалити',
    LOAD_ERROR: 'Не вдалося завантажити конкурс.',
  },
  competitionEdit: {
    HEADING: 'Редагувати конкурс',
    SUBMIT: 'Зберегти зміни',
  },
  team: {
    HEADING: 'Команда конкурсу',
    ADD_ADMIN_BUTTON: '+ Додати адміна',
    ONLY_MANAGER_MESSAGE: 'Поки що ви єдина людина, яка керує конкурсом',
    MODAL_TITLE: 'Додати адміна',
    MODAL_SUBMIT: 'Надіслати запрошення',
  },
  admins: {
    HEADING: 'Адміністратори',
    SUBMIT: 'Створити адміністратора',
  },
} as const;
