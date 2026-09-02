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
} as const;
