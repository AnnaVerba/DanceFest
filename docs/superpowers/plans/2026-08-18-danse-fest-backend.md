# DanseFest Backend — план реалізації

> **Для агентів:** ОБОВ'ЯЗКОВИЙ САБ-СКІЛ: використовуй `superpowers:subagent-driven-development` (рекомендовано) або `superpowers:executing-plans`, щоб виконувати план задача за задачею. Кроки позначені чекбоксами (`- [ ]`).

**Мета:** Побудувати серверну частину ядра змагання — від розщеплення плоскої заявки до програми фестивалю, суддівства через бригади й зведення результатів.

**Архітектура:** NestJS-модуль на кожну межу з §5 бачення. Модуль ніколи не імпортує сервіс модуля, що стоїть правіше в схемі залежностей. Уся арифметика часу, кворуму й зведення результатів винесена в чисті функції без доступу до БД — саме вони покриті тестами.

**Стек:** NestJS 11, Sequelize 6 + sequelize-typescript, PostgreSQL, sequelize-cli (міграції в `backend/migrations/`, конфіг `backend/src/config/database.js`), Jest (`*.spec.ts` поруч із кодом, `rootDir: src`), class-validator для DTO, passport-jwt.

**Spec:** `docs/superpowers/specs/2026-08-18-danse-fest-technical-vision-design.md`

## Глобальні обмеження

- Усі первинні ключі — `UUID` з `defaultValue: DataTypes.UUIDV4`.
- Кожна міграція має робочий `down`. Міграції створюються вручну у форматі
  `YYYYMMDDHHmmss-опис.ts`, за зразком `20260822090100-create-template-nominations.ts`.
- Іменування: таблиці — `snake_case` множина, поля — `camelCase` (так уже в проєкті).
- Кожна таблиця має `createdAt` і `updatedAt` (`allowNull: false`).
- Зовнішні ключі — з `onDelete: 'CASCADE', onUpdate: 'CASCADE'`, крім явно
  зазначених випадків.
- DTO валідуються через class-validator; `main.ts` уже має глобальний `ValidationPipe`.
- Гроші — `DECIMAL(10, 2)`. Тривалості — цілі **секунди** (`INTEGER`), ніколи не float.
- Час у розкладі зберігається як `TIME` або обчислюється; **час виступу ніколи не приймається з клієнта** (інваріант 2 бачення).
- Команди: `npm run migrate`, `npm test`, `npm run lint` з теки `backend/`.
- Коментарі в коді — українською, лише там, де пояснюють *чому*, а не *що*
  (так уже в проєкті).

---

## Фаза 1 — Ролі й акаунти

### Task 1: Єдина таблиця користувачів із ролями

Зараз `admins` — єдина таблиця людей із паролем, а `judges` живе окремо зі своїм JWT. З'являються керівник і учасник, тож потрібна спільна основа.

**Files:**
- Create: `backend/migrations/20260823090000-rename-admins-to-users.ts`
- Modify: `backend/src/admins/admin.model.ts` → перейменувати у `backend/src/users/user.model.ts`
- Modify: `backend/src/admins/admins.service.ts` → `backend/src/users/users.service.ts`
- Modify: `backend/src/admins/admins.module.ts` → `backend/src/users/users.module.ts`
- Modify: `backend/src/auth/auth.service.ts`, `backend/src/auth/dto/register.dto.ts`, `backend/src/auth/jwt.strategy.ts`
- Modify: усі файли, що імпортують `Admin` (competitions, team, category-templates)
- Test: `backend/src/users/users.service.spec.ts`

**Interfaces:**
- Produces: `User` модель із полем `role: 'superadmin' | 'organizer' | 'coach'`; `UsersService.findByEmail(email)`, `UsersService.create({name, email, password, role})`.

**Правила:**
- Таблиця `admins` перейменовується на `users`; додається колонка `role`
  (`ENUM('superadmin','organizer','coach')`, `allowNull: false`,
  `defaultValue: 'organizer'` — усі наявні записи є організаторами).
- Додаються необов'язкові поля профілю, потрібні за §8.14 бачення:
  `city` (STRING, null), `studioName` (STRING, null), `phone` (STRING, null).
- `competition_admins.adminId` перейменовується на `userId`.
- Модель `Judge` **не зливається** з `User` — вхід судді лишається окремим
  (JWT з іншим payload). Але `judges` отримує колонку `userId` (UUID, null,
  `onDelete: 'SET NULL'`) на випадок, коли суддя має і звичайний акаунт.
- Реєстрація через `POST /auth/register` приймає `role`, але дозволяє лише
  `'organizer' | 'coach'`. Спроба зареєструватись як
  `superadmin` → `400`.

- [ ] **Крок 1: Написати падаючий тест** у `users.service.spec.ts`: `create()` з роллю `'coach'` повертає користувача з `role === 'coach'`; `create()` з роллю `'superadmin'` кидає `BadRequestException`.
- [ ] **Крок 2: Запустити** `npm test -- users.service` — має впасти (модуля немає).
- [ ] **Крок 3: Написати міграцію** перейменування + нові колонки, з робочим `down`.
- [ ] **Крок 4: Перейменувати модель і сервіс**, оновити всі імпорти. Перевірити: `npx tsc --noEmit`.
- [ ] **Крок 5: Прогнати** `npm run migrate` і `npm test` — усе зелене.
- [ ] **Крок 6: Коміт** `refactor(backend): merge admins into users with roles`

---

## Фаза 2 — Розщеплення заявки

Найважча й найважливіша частина. Поточна `Entry` несе одночасно людину, заявку й виступ (§11 бачення). Без розщеплення не працюють ні спецкатегорії, ні наскрізний номер, ні дедуплікація.

### Task 2: Модель Person

**Files:**
- Create: `backend/migrations/20260823090100-create-persons.ts`
- Create: `backend/src/persons/person.model.ts`
- Create: `backend/src/persons/persons.module.ts`
- Test: (модель без логіки — тестів немає, покривається в Task 6)

**Interfaces:**
- Produces: модель `Person`.

**Поля:** `id`, `lastName` (STRING, not null), `firstName` (STRING, not null),
`middleName` (STRING, null), `birthDate` (DATEONLY, **null** — рішення Р5:
поле необов'язкове), `city` (STRING, null), `studioName` (STRING, null),
**Індекси:** по `(lastName, firstName)` — для пошуку кандидатів у Task 8;
по `studioName` — другий складник ключа збігу.

**`Person` не має посилання на користувача.** Учасник не заводить акаунт
(рішення Р9 бачення): він існує лише як запис даних, який створює тренер.
Колонки `userId` тут немає й не має бути — інакше вона стане мертвим полем,
яке хтось згодом почне заповнювати навмання.

**Чому `birthDate` не обов'язковий:** див. §12-Р5 бачення. Вікова категорія
береться з номінації, не з дати народження.

- [ ] **Крок 1:** написати міграцію.
- [ ] **Крок 2:** написати модель за зразком `venue.model.ts`.
- [ ] **Крок 3:** зареєструвати `PersonsModule` в `app.module.ts`.
- [ ] **Крок 4:** `npm run migrate` — таблиця створена, `npm run migrate:undo` — знята, потім знову `migrate`.
- [ ] **Крок 5: Коміт** `feat(backend): add person model`

### Task 3: Моделі Registration і Performance

**Files:**
- Create: `backend/migrations/20260823090200-create-registrations.ts`
- Create: `backend/migrations/20260823090300-create-performances.ts`
- Create: `backend/src/registrations/registration.model.ts`
- Create: `backend/src/registrations/registration-participant.model.ts`
- Create: `backend/src/performances/performance.model.ts`

**Interfaces:**
- Consumes: `Person` (Task 2), `Nomination`, `Competition`.
- Produces: моделі `Registration`, `RegistrationParticipant`, `Performance`.

**`Registration` (заявка) — намір виступити в номінації:**
`id`, `competitionId` (FK), `nominationId` (FK), `routineName` (STRING, null —
назва номера), `coachId` (UUID, null, FK → users — хто подав, якщо тренер),
`submittedByUserId` (UUID, not null — хто натиснув кнопку),
`choreographer` (STRING, null), `studioName` (STRING, null), `city` (STRING, null),
`improv` (BOOLEAN, default false — це імпровізаційна заявка),
`status` (`ENUM('draft','submitted','confirmed','cancelled')`, default `'submitted'`).

**`RegistrationParticipant` — склад заявки (соло = один рядок):**
`id`, `registrationId` (FK), `personId` (FK). Унікальний індекс на
`(registrationId, personId)` — одну людину не можна додати двічі в один номер.

**`Performance` (вихід на сцену) — одиниця програми й суддівства:**
`id`, `registrationId` (FK), `competitionId` (FK — денормалізація заради
фільтрів), `programName` (STRING, null — заповнено лише для спецкатегорій із
кількома виходами, Task 16), `round` (`ENUM('final','semifinal')`, default
`'final'` — Task 22), `status` (`ENUM('scheduled','absent','withdrawn')`,
default `'scheduled'`).

**Ключове правило:** одна `Registration` породжує **один або кілька**
`Performance`. Кількість задає номінація (Task 16). Для звичайного соло — один.

- [ ] **Крок 1:** написати обидві міграції з індексами.
- [ ] **Крок 2:** написати три моделі з зв'язками (`@HasMany`, `@BelongsTo`).
- [ ] **Крок 3:** `npm run migrate`, потім `npm run migrate:undo:all` і `npm run migrate` — обидва напрямки робочі.
- [ ] **Крок 4: Коміт** `feat(backend): add registration and performance models`

### Task 4: Наскрізний номер учасника

Інваріант 6 бачення: особа має рівно один номер у межах конкурсу, на всі свої виступи.

**Files:**
- Create: `backend/migrations/20260823090400-create-competition-participant-numbers.ts`
- Create: `backend/src/persons/competition-participant-number.model.ts`
- Create: `backend/src/persons/participant-numbers.service.ts`
- Test: `backend/src/persons/participant-numbers.service.spec.ts`

**Interfaces:**
- Produces: `ParticipantNumbersService.assign(competitionId, personId): Promise<number>` — повертає наявний номер або видає наступний вільний.

**Таблиця `competition_participant_numbers`:** `id`, `competitionId` (FK),
`personId` (FK), `number` (INTEGER, not null).
**Унікальні індекси:** `(competitionId, personId)` і `(competitionId, number)`.

**Алгоритм видачі:**
1. Шукаємо наявний запис за `(competitionId, personId)` → якщо є, повертаємо `number`.
2. Якщо немає — беремо `MAX(number) + 1` у межах конкурсу (перший номер — 1).
3. Уся операція — в транзакції з `SELECT ... FOR UPDATE` на рядках конкурсу,
   щоб дві паралельні реєстрації не отримали однаковий номер.
4. При конфлікті унікального індексу — одна повторна спроба, потім `ConflictException`.

- [ ] **Крок 1: Падаючі тести:** (а) двічі викликати `assign` для тієї самої особи → однаковий номер; (б) для двох різних осіб → 1 і 2; (в) для тієї самої особи у двох різних конкурсах → номери незалежні.
- [ ] **Крок 2:** `npm test -- participant-numbers` — падає.
- [ ] **Крок 3:** міграція + модель + сервіс.
- [ ] **Крок 4:** `npm test -- participant-numbers` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): assign per-competition participant numbers`

### Task 5: Міграція даних із entries

**Files:**
- Create: `backend/migrations/20260823090500-migrate-entries-to-registrations.ts`

**Правила перетворення** кожного рядка `entries`:
1. **Person:** розібрати `Entry` на особу. Поточна `Entry` не має окремих полів
   ПІБ — прізвище й ім'я лежать у `routineName` або відсутні. Тому:
   беремо `routineName` як `lastName + firstName`, розділивши по першому пробілу;
   якщо пробілу немає — усе йде в `lastName`, `firstName` = `'—'`.
   `city`, `studioName` копіюються з `Entry`.
2. **Дедуплікація в межах конкурсу:** якщо особа з такими `lastName`,
   `firstName` і `studioName` уже створена цією міграцією для цього конкурсу —
   перевикористати її. **Між конкурсами не зливати** (рішення Р7).
3. **Registration:** одна на `Entry`. `nominationId` шукається за збігом
   `nominations.name` з `entries.nomination` у межах конкурсу; якщо збігу немає —
   створити номінацію з цією назвою і `price: null`.
   `improv`, `choreographer`, `studioName`, `city` копіюються. `status = 'confirmed'`.
4. **RegistrationParticipant:** один рядок, особа з кроку 1.
5. **Performance:** рівно один, `round = 'final'`, `status = 'scheduled'`.
6. **Номери:** `entries.number` переноситься в `competition_participant_numbers`.
   Якщо у двох `Entry` тієї самої особи різні номери — перемагає найменший,
   решта відкидається (наскрізний номер один — інваріант 6).
7. `entries` **не видаляється** цією міграцією. Її дропне Task 21, коли всі
   споживачі перемкнуться.

**`down`:** видаляє всі створені `registrations`, `performances`,
`registration_participants`, `persons`, `competition_participant_numbers`.
`entries` лишалась недоторканою, тож відкат безпечний.

- [ ] **Крок 1:** написати міграцію.
- [ ] **Крок 2:** засіяти локальну БД кількома `entries` вручну (SQL або через існуючий API).
- [ ] **Крок 3:** `npm run migrate` → перевірити SQL-запитом, що кількість `registrations` дорівнює кількості `entries`, а `persons` — кількості унікальних людей.
- [ ] **Крок 4:** `npm run migrate:undo` → усі нові таблиці порожні, `entries` на місці.
- [ ] **Крок 5: Коміт** `feat(backend): migrate entries into persons and registrations`

### Task 6: RegistrationsService — подання заявки

**Files:**
- Create: `backend/src/registrations/registrations.service.ts`
- Create: `backend/src/registrations/registrations.controller.ts`
- Create: `backend/src/registrations/registrations.module.ts`
- Create: `backend/src/registrations/dto/create-registration.dto.ts`
- Test: `backend/src/registrations/registrations.service.spec.ts`

**Interfaces:**
- Consumes: `ParticipantNumbersService.assign` (Task 4).
- Produces: `RegistrationsService.create(competitionId, userId, dto)`.

**DTO (`CreateRegistrationDto`) — ключова форма, §8.4 бачення:**
```ts
export class RegistrationParticipantDto {
  @IsOptional() @IsUUID() personId?: string;   // наявна особа з ростера
  @IsOptional() @IsString() lastName?: string; // або нова особа
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsDateString() birthDate?: string; // необов'язково (Р5)
}

export class CreateRegistrationDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => RegistrationParticipantDto)
  participants: RegistrationParticipantDto[];

  @IsArray() @IsUUID('4', { each: true }) @ArrayNotEmpty()
  nominationIds: string[];      // кілька номінацій за одну дію

  @IsOptional() @IsString() routineName?: string;
  @IsOptional() @IsString() choreographer?: string;
  @IsOptional() @IsString() studioName?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsBoolean() improv?: boolean;
}
```

**Правила `create`:**
1. Конкурс існує і його реєстрація відкрита: `registrationFrom <= сьогодні <= registrationTo`. Інакше `403` з повідомленням `'Реєстрація на цей конкурс закрита'`.
2. Кожен елемент `participants` або має `personId` (тоді особа береться з БД),
   або `lastName` (тоді створюється нова особа). Якщо немає ні того, ні того — `400`.
3. **Створюється одна `Registration` на кожну номінацію** зі списку
   `nominationIds`, з тим самим складом учасників. Це і є «кілька номінацій в
   одному вікні»: один запит замість семи.
4. Кожній особі складу видається наскрізний номер через `ParticipantNumbersService.assign`.
5. Для кожної `Registration` створюються `Performance` (кількість — Task 16;
   поки що завжди один).
6. Уся операція — в **одній транзакції**. Часткової заявки не буває.
7. Якщо `submittedByUserId` має роль `'coach'` — `coachId` заповнюється ним же.
8. **Дублікат:** якщо для цієї номінації вже існує неcкасована `Registration` з
   тим самим складом учасників — `409` з повідомленням
   `'Ця заявка вже подана'`. Порівняння складу — за множиною `personId`.

**Правила `cancel(registrationId, userId)`:**
- Дозволено автору заявки, тренеру заявки, організатору й адміну конкурсу.
- `status → 'cancelled'`, усі її `Performance` → `status: 'withdrawn'`.
- Якщо хоч один `Performance` уже стоїть у відділенні (Task 12) — заявка
  скасовується, але у відповідь додається прапорець
  `{ requiresScheduleRecalculation: true }` (інваріант 10).

**Ендпоінти:**
- `POST /competitions/:competitionId/registrations` — створити (JWT).
- `GET /competitions/:competitionId/registrations` — список (організатор/адмін: усі; тренер: свої).
- `DELETE /registrations/:id` — скасувати.

- [ ] **Крок 1: Падаючі тести:** (а) одна заявка на 3 номінації створює 3 `Registration` і 3 `Performance`; (б) обидва учасники групового номера отримали номери; (в) повторна ідентична заявка → `409`; (г) заявка після `registrationTo` → `403`; (д) помилка на третій номінації відкочує перші дві.
- [ ] **Крок 2:** `npm test -- registrations.service` — падає.
- [ ] **Крок 3:** реалізувати сервіс, контролер, DTO, модуль.
- [ ] **Крок 4:** `npm test -- registrations.service` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): submit one registration across many nominations`

---

## Фаза 3 — Ростер керівника й дедуплікація

### Task 7: Ростер керівника

**Files:**
- Create: `backend/migrations/20260823090600-create-coach-roster.ts`
- Create: `backend/src/persons/coach-roster-entry.model.ts`
- Modify: `backend/src/persons/persons.service.ts` (створити, якщо ще немає)
- Test: `backend/src/persons/coach-roster.service.spec.ts`

**Таблиця `coach_roster_entries`:** `id`, `coachId` (FK → users), `personId`
(FK → persons). Унікальний індекс `(coachId, personId)`.

**Правила:**
- Особа потрапляє в ростер автоматично при першій заявці від цього тренера
  (виклик з `RegistrationsService.create`).
- `DELETE /roster/:personId` **видаляє лише рядок ростера**, не `Person`
  (§8.4: «хрестик прибирає особу з ростера цього керівника, не видаляючи її з
  системи» — дитина могла перейти до іншого тренера).
- Видалення заборонено, якщо в цієї особи є неcкасована заявка від цього тренера
  в конкурсі, реєстрація якого ще відкрита → `409` з поясненням.
- `GET /roster` повертає осіб, відсортованих за прізвищем, з полем
  `lastRegisteredAt` — коли тренер останній раз їх заявляв.

**Ендпоінти:** `GET /roster`, `DELETE /roster/:personId` (обидва — роль `coach`).

- [ ] **Крок 1: Падаючі тести:** (а) після заявки особа з'явилась у ростері; (б) `DELETE` прибирає з ростера, але `Person` лишається в БД; (в) `DELETE` при активній заявці → `409`.
- [ ] **Крок 2:** `npm test -- coach-roster` — падає.
- [ ] **Крок 3:** міграція, модель, сервіс, ендпоінти.
- [ ] **Крок 4:** `npm test -- coach-roster` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): add coach roster`

### Task 8: Пошук кандидатів і ручне злиття осіб

Реалізує §8.5 бачення після відмови від обов'язкової дати народження.

**Files:**
- Create: `backend/src/persons/person-matching.ts` (чиста функція, без БД)
- Modify: `backend/src/persons/persons.service.ts`
- Modify: `backend/src/persons/persons.controller.ts`
- Test: `backend/src/persons/person-matching.spec.ts`

**Interfaces:**
- Produces: `scoreCandidate(query, candidate): number` — 0..100; `PersonsService.findCandidates(query)`, `PersonsService.merge(targetId, sourceId, requesterId)`.

**Алгоритм `scoreCandidate` (чиста функція):**
```
базa = 0
ПІБ збігається (без урахування регістру, після trim)      → +50
studioName збігається (без регістру)                       → +30
coachId збігається (особа є в ростері того самого тренера)  → +30
birthDate вказана в обох і збігається                       → +20
birthDate вказана в обох і НЕ збігається                    → -60
city збігається                                             → +5
результат = clamp(база, 0, 100)
```
Кандидати з результатом `>= 60` показуються користувачеві. Автоматичне
злиття **не робиться ніколи** (рішення Р7) — навіть при 100.

**`merge(targetId, sourceId)`:**
- Дозволено лише ролі `organizer`/`superadmin` або адміну конкурсу.
- Усі `registration_participants`, `coach_roster_entries` і
  `competition_participant_numbers` джерела перевішуються на ціль.
- **Конфлікт номерів:** якщо в одному конкурсі обидві особи мають номер —
  лишається номер цілі, номер джерела звільняється.
- **Конфлікт складу:** якщо після злиття в одній заявці опиняться дві копії
  однієї особи — дублікат видаляється (унікальний індекс із Task 3).
- `Person` джерела видаляється. Операція в транзакції, незворотна —
  контролер вимагає підтвердження прапорцем `confirm: true` у тілі, інакше `400`.

**Ендпоінти:**
- `GET /persons/candidates?lastName=&firstName=&studioName=&birthDate=` → відсортований за спаданням `score` список.
- `POST /persons/:targetId/merge` з тілом `{ sourceId, confirm }`.

- [ ] **Крок 1: Падаючі тести `person-matching.spec.ts`:** однакові ПІБ + студія → 80; однакові ПІБ, різні студії → 50 (нижче порогу); різні дати народження при однакових ПІБ і студії → 20; порожній запит → 0.
- [ ] **Крок 2:** `npm test -- person-matching` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4:** `npm test -- person-matching` — зелено.
- [ ] **Крок 5:** реалізувати `findCandidates` і `merge` з тестом на перевішування номерів.
- [ ] **Крок 6: Коміт** `feat(backend): person candidate matching and manual merge`

---

## Фаза 4 — Правила конкурсу

### Task 9: Сутність правил конкурсу

Це те місце, куди дописуються всі майбутні налаштування, не чіпаючи решту системи (§5.2 бачення).

**Files:**
- Create: `backend/migrations/20260823090700-create-competition-rules.ts`
- Create: `backend/src/competition-rules/competition-rules.model.ts`
- Create: `backend/src/competition-rules/duration-limit.model.ts`
- Create: `backend/src/competition-rules/competition-rules.service.ts`
- Create: `backend/src/competition-rules/competition-rules.controller.ts`
- Create: `backend/src/competition-rules/competition-rules.module.ts`
- Create: `backend/src/competition-rules/dto/update-competition-rules.dto.ts`
- Test: `backend/src/competition-rules/competition-rules.service.spec.ts`

**`competition_rules` (один рядок на конкурс, `competitionId` унікальний):**

| Поле | Тип | Default | Що означає |
|---|---|---|---|
| `pauseSeconds` | INTEGER | `20` | пауза після виступу (§8.6) |
| `timeSource` | ENUM(`track`,`limit`) | `limit` | як рахувати час при вимкнених доплатах |
| `surchargesEnabled` | BOOLEAN | `false` | глобальний вимикач доплат за переліміт |
| `coachPercent` | DECIMAL(5,2) | `0` | відсоток керівника, один на конкурс (Р3) |
| `semifinalThreshold` | INTEGER | `12` | понад скільки заявок вмикається півфінал |
| `improvGroupSeconds` | INTEGER | `60` | тривалість загального заходу імпровізації |
| `improvIndividualSeconds` | INTEGER | `30` | тривалість індивідуального заходу |
| `quorum` | INTEGER | `3` | скільки суддів мають надіслати аркуш |

**`overlimit_tariffs` (тарифи перелімітів, багато на конкурс):**
`id`, `competitionId`, `uptoSeconds` (INTEGER — переліміт **до** скількох секунд),
`price` (DECIMAL(10,2)). Приклад із документа: `{30, 150}`, `{60, 200}`.

**`duration_limits` (ліміти тривалості):**
`id`, `competitionId`, `nominationId` (UUID, null), `categoryId` (UUID, null —
ліга або номінація як вісь), `round` (ENUM(`final`,`semifinal`), default `final`),
`seconds` (INTEGER).

**Розв'язання ліміту для виступу — `resolveLimit(performance)`:**
1. Точний збіг `nominationId` + `round` → він.
2. Збіг `categoryId` (будь-яка з осей номінації) + `round` → найспецифічніший
   (той, чия вісь має тип `level`, тобто ліга — пріоритетніший за `age`).
3. Немає нічого → `180` секунд і попередження в лог.

**Правила сервісу:**
- Рядок правил створюється **автоматично зі значеннями за замовчуванням** при
  створенні конкурсу — організатор може ніколи в них не заходити (§8.1, крок 5).
  Для цього `CompetitionsService.create` викликає `CompetitionRulesService.ensureDefaults`.
- `PATCH /competitions/:id/rules` — часткове оновлення, доступ організатору й адміну.
- Зміна `pauseSeconds` або лімітів **не перераховує** вже сформовані відділення
  автоматично — це робить явна дія в Task 13. Причина: непередбачуваний зсув
  часу посеред фестивалю гірший за застарілий розклад.

- [ ] **Крок 1: Падаючі тести:** (а) створення конкурсу створює правила з `pauseSeconds === 20`; (б) `resolveLimit` віддає перевагу точному `nominationId` над `categoryId`; (в) при повній відсутності лімітів повертає 180.
- [ ] **Крок 2:** `npm test -- competition-rules` — падає.
- [ ] **Крок 3:** міграції, моделі, сервіс, контролер.
- [ ] **Крок 4:** `npm test -- competition-rules` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): add competition rules entity`

---

## Фаза 5 — Треки й переліміти

### Task 10: Завантаження треку й вимірювання тривалості

**Files:**
- Create: `backend/migrations/20260823090800-create-tracks.ts`
- Create: `backend/src/tracks/track.model.ts`
- Create: `backend/src/tracks/track-duration.ts` (вимірювання)
- Create: `backend/src/tracks/tracks.service.ts`
- Create: `backend/src/tracks/tracks.controller.ts`
- Create: `backend/src/tracks/tracks.module.ts`
- Modify: `backend/package.json` — додати `music-metadata` і `@types/multer`
- Test: `backend/src/tracks/tracks.service.spec.ts`

**Таблиця `tracks`:** `id`, `performanceId` (FK, унікальний — один трек на вихід),
`originalFileName` (STRING), `storedPath` (STRING), `mimeType` (STRING),
`durationSeconds` (INTEGER, not null), `sizeBytes` (INTEGER),
`uploadedByUserId` (UUID FK).

**Правила:**
- **Формати не обмежуються mp3** (пряма вимога документа замовника). Приймаються
  `audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/aac`,
  `audio/ogg`, `audio/flac`, `audio/x-m4a`. Інший тип → `415` з переліком
  дозволених.
- Максимальний розмір — 50 МБ; більше → `413`.
- Тривалість вимірюється на сервері бібліотекою `music-metadata`
  (`parseFile` → `format.duration`), округлюється **вгору** до цілої секунди.
  Клієнтське значення тривалості не приймається взагалі.
- Якщо метадані не читаються → `422` з повідомленням
  `'Не вдалося визначити тривалість треку. Спробуйте інший файл або формат'`.
- Завантаження дозволене, доки не минув **термін завантаження треків** конкурсу
  (окремий від терміну реєстрації, §8.1). Після — `403`.
- Повторне завантаження **замінює** попередній трек: старий файл видаляється,
  нарахування за переліміт перераховується (Task 18).
- Файли лягають у `backend/uploads/tracks/<competitionId>/<performanceId>.<ext>`.
  Тека в `.gitignore`.
- Для заявок з `improv: true` трек не потрібен: спроба завантажити → `400`
  з повідомленням `'Для імпровізації трек не потрібен — музику вмикає організатор'`.

**Ендпоінти:** `POST /performances/:id/track` (multipart), `DELETE /performances/:id/track`.

- [ ] **Крок 1: Падаючі тести:** (а) wav-файл приймається; (б) `application/pdf` → `415`; (в) тривалість 72.3 с зберігається як 73; (г) завантаження на імпровізаційну заявку → `400`.
- [ ] **Крок 2:** `npm test -- tracks.service` — падає.
- [ ] **Крок 3:** `npm i music-metadata @types/multer`, міграція, модель, сервіс.
- [ ] **Крок 4:** `npm test -- tracks.service` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): accept multi-format tracks and measure duration`

### Task 11: Розрахунок тривалості виступу

Чиста функція. Це серце програми фестивалю — уся неоднозначність документа замовника зведена сюди в один детермінований алгоритм.

**Files:**
- Create: `backend/src/program/performance-duration.ts`
- Test: `backend/src/program/performance-duration.spec.ts`

**Interfaces:**
- Produces:
```ts
export interface DurationInput {
  improv: boolean;
  isGroupImprov: boolean;      // заявка з кількох осіб
  trackDurationSeconds: number | null;
  limitSeconds: number;         // з resolveLimit (Task 9)
  surchargesEnabled: boolean;
  overlimitPaid: boolean;
  timeSource: 'track' | 'limit';
  improvGroupSeconds: number;
  improvIndividualSeconds: number;
}

export function performanceDuration(input: DurationInput): number;
```

**Алгоритм — рівно в такому порядку:**
```
1. improv → return isGroupImprov ? improvGroupSeconds : improvIndividualSeconds
2. trackDurationSeconds === null → return limitSeconds   // трек ще не залили
3. trackDurationSeconds <= limitSeconds → return trackDurationSeconds
   // далі — переліміт
4. surchargesEnabled  → return overlimitPaid ? trackDurationSeconds : limitSeconds
5. інакше             → return timeSource === 'track' ? trackDurationSeconds : limitSeconds
```

**Звідки взяті кроки 4 і 5:** документ каже «якщо треки проплачені —
рахується повна тривалість, якщо ні — рахується максимальний час, вказаний у
положенні» (крок 4), і окремо «якщо конкурс без доплат, треба дати два
варіанти: рахувати по тривалості треків або по часу, який вказаний у
положенні» (крок 5).

- [ ] **Крок 1: Падаючі тести** — по одному на кожен із п'яти кроків, плюс граничний випадок `trackDuration === limitSeconds` (не переліміт).
- [ ] **Крок 2:** `npm test -- performance-duration` — падає.
- [ ] **Крок 3:** реалізувати функцію (10 рядків, без залежностей).
- [ ] **Крок 4:** `npm test -- performance-duration` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): deterministic performance duration`

---

## Фаза 6 — Програма фестивалю

### Task 12: Дні, відділення й позиції

**Files:**
- Create: `backend/migrations/20260823090900-create-competition-days.ts`
- Create: `backend/migrations/20260823091000-create-sections.ts`
- Create: `backend/src/program/competition-day.model.ts`
- Create: `backend/src/program/section.model.ts`
- Create: `backend/src/program/section-item.model.ts`

**`competition_days`:** `id`, `competitionId` (FK), `date` (DATEONLY),
`label` (STRING, null). Унікальний індекс `(competitionId, date)`.

**`sections` (відділення):** `id`, `competitionId` (FK), `dayId` (FK),
`venueId` (FK → venues), `name` (STRING — «Відділення 1»),
`startTime` (TIME, not null), `sortOrder` (INTEGER).

**`section_items` (позиція у відділенні):** `id`, `sectionId` (FK),
`performanceId` (FK, null), `type` (ENUM(`performance`,`award`)),
`nominationGroupKey` (STRING — ключ групування, Task 13),
`sortOrder` (INTEGER, not null).

**Інваріант 1 бачення:** унікальний індекс на `section_items.performanceId`
(`WHERE performanceId IS NOT NULL`) — один вихід належить рівно одному відділенню.

**Інваріант 9:** позиція типу `award` завжди має найбільший `sortOrder` у
відділенні. Перевіряється в сервісі (Task 13), не в БД.

- [ ] **Крок 1:** три міграції з індексами, включно з частковим унікальним індексом на `performanceId`.
- [ ] **Крок 2:** три моделі зі зв'язками.
- [ ] **Крок 3:** `npm run migrate`, перевірити, що вставка двох `section_items` з одним `performanceId` падає з помилкою унікальності.
- [ ] **Крок 4: Коміт** `feat(backend): add days, sections and section items`

### Task 13: Формування відділення й розрахунок розкладу

**Files:**
- Create: `backend/src/program/schedule-calculator.ts` (чиста функція)
- Create: `backend/src/program/program.service.ts`
- Create: `backend/src/program/program.controller.ts`
- Create: `backend/src/program/program.module.ts`
- Create: `backend/src/program/dto/create-section.dto.ts`
- Test: `backend/src/program/schedule-calculator.spec.ts`
- Test: `backend/src/program/program.service.spec.ts`

**Interfaces:**
- Consumes: `performanceDuration` (Task 11), `resolveLimit` (Task 9).
- Produces:
```ts
export interface ScheduleItemInput {
  itemId: string;
  type: 'performance' | 'award';
  nominationGroupKey: string;
  durationSeconds: number;
  isImprovisationGroup: boolean;
}

export interface ScheduleItemOutput {
  itemId: string;
  startAtSeconds: number;   // від опівночі
  durationSeconds: number;
}

export function calculateSchedule(
  startTimeSeconds: number,
  items: ScheduleItemInput[],
  pauseSeconds: number,
): ScheduleItemOutput[];
```

**Алгоритм `calculateSchedule`:**
```
cursor = startTimeSeconds
out = []
for each сусідня група позицій з однаковим nominationGroupKey:
    for each item у групі:
        if item.type === 'award':
            out.push({ item, startAt: cursor, duration: 0 })
            continue
        out.push({ item, startAt: cursor, duration: item.duration })
        cursor += item.duration
        if (!group.isImprovisationGroup) cursor += pauseSeconds   // пауза після виступу
    if (group.isImprovisationGroup) cursor += pauseSeconds        // пауза після номінації
return out
```

**Чому дві гілки паузи:** документ прямо каже — «пауза додається після кожного
виступу, а не номінації, але якщо можна, там де імпровізація, додавати паузу
навпаки після номінації, а не кожного виступу» (§8.6 бачення).

**Правила `ProgramService.createSection(competitionId, userId, dto)`:**
1. Доступ — організатор або адмін конкурсу, інакше `403`.
2. `dto`: `{ dayId, venueId, name, startTime, performanceIds[] }`.
3. Кожен `performanceId` має бути **нерозподіленим** (не мати `section_item`).
   Інакше `409` зі списком уже розподілених.
4. Виходи групуються за номінацією; порядок груп — за `nominations.createdAt`,
   порядок усередині групи — за наскрізним номером учасника (за зростанням).
5. **Останнім рядком автоматично додається позиція `award`** (нагородження)
   з найбільшим `sortOrder` — інваріант 9.
6. Час не зберігається в `section_items`. Він обчислюється `calculateSchedule`
   при кожному читанні програми. Це інваріант 2: час ніколи не вводиться.
7. `GET /competitions/:id/program?dayId=&venueId=` повертає відділення з
   обчисленим часом кожної позиції і **часом нагородження = час старту +
   сума всіх виступів і пауз**.

**Ендпоінти:**
- `GET /competitions/:id/performances/unassigned?ageCategoryId=&levelId=` — пул для фільтра (§8.7, крок 2).
- `POST /competitions/:id/sections` — сформувати відділення.
- `GET /competitions/:id/program` — програма з часом.

- [ ] **Крок 1: Падаючі тести `schedule-calculator.spec.ts`:** (а) три виступи по 60 с із паузою 20 с від 09:00:00 → 09:00:00, 09:01:20, 09:02:40, нагородження о 09:04:00; (б) імпровізаційна група з трьох виступів по 30 с → пауза додається один раз, не тричі; (в) порожнє відділення → лише нагородження в час старту.
- [ ] **Крок 2:** `npm test -- schedule-calculator` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4:** `npm test -- schedule-calculator` — зелено.
- [ ] **Крок 5: Падаючі тести `program.service.spec.ts`:** (а) повторне додавання вже розподіленого виходу → `409`; (б) нагородження завжди останнє; (в) фільтр за лігою повертає лише відповідні виходи.
- [ ] **Крок 6:** реалізувати сервіс і контролер, прогнати тести.
- [ ] **Крок 7: Коміт** `feat(backend): build sections and calculate schedule`

### Task 14: Ручне перевпорядкування, перенесення й об'єднання категорій

**Files:**
- Modify: `backend/src/program/program.service.ts`
- Modify: `backend/src/program/program.controller.ts`
- Create: `backend/src/program/dto/reorder-section.dto.ts`
- Create: `backend/src/program/dto/merge-groups.dto.ts`
- Test: `backend/src/program/program-reorder.spec.ts`

**`PATCH /sections/:id/order`** з тілом `{ itemIds: string[] }`:
- Список має містити **рівно ті самі** `itemId`, що вже у відділенні —
  інакше `400` з повідомленням `'Список позицій не збігається зі складом відділення'`.
  Це захист від гонки, коли двоє адмінів тягають рядки одночасно.
- Позиція `award` мовчки переставляється в кінець, навіть якщо клієнт прислав її в середині (інваріант 9).
- Час перераховується при наступному читанні — зберігати нічого не треба.

**`POST /performances/:id/move`** з тілом `{ sectionId, afterItemId? }`:
- Переносить вихід в інше відділення, знімаючи стару позицію.
- `afterItemId: null` → у початок.

**`POST /sections/:id/merge-groups`** з тілом `{ groupKeys: string[], mergedLabel: string }`:
- Реалізує §8.7, крок 7 — ручне об'єднання категорій (Юніори 1 + Юніори 2).
- Усім `section_items` перелічених груп присвоюється спільний
  `nominationGroupKey = 'merged:' + uuid`, а `mergedLabel` зберігається в
  новій таблиці `merged_group_labels` (`id`, `sectionId`, `groupKey`, `label`).
- **Об'єднання діє лише в межах цього конкурсу і не змінює довідник осей**
  (§8.7). Номінації самі лишаються незмінними — це важливо, бо судять і
  рахують результати досі по вихідних номінаціях, а об'єднана лише подача в програмі.
- Розділити назад: `DELETE /sections/:id/merge-groups/:groupKey` — повертає
  вихідні `nominationGroupKey` кожного виходу.

- [ ] **Крок 1: Падаючі тести:** (а) перевпорядкування з чужим `itemId` → `400`; (б) `award` опиняється в кінці, навіть якщо переданий першим; (в) після об'єднання двох груп `calculateSchedule` бачить одну групу, тож пауза між ними лишається звичайною; (г) розділення повертає вихідні ключі.
- [ ] **Крок 2:** `npm test -- program-reorder` — падає.
- [ ] **Крок 3:** реалізувати три ендпоінти + міграцію `merged_group_labels`.
- [ ] **Крок 4:** `npm test -- program-reorder` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): reorder, move and merge program groups`

### Task 15: Дві проєкції програми

**Files:**
- Modify: `backend/src/program/program.service.ts`
- Create: `backend/src/program/program-projections.ts`
- Test: `backend/src/program/program-projections.spec.ts`

**Публічна проєкція (`GET /competitions/:id/program`)** — доступна без авторизації:
номер учасника, ПІБ, студія, керівник, назва номінації, час.
Якщо запит авторизований тренером, кожна позиція отримує прапорець
`isMyStudent: true` — серед учасників виходу є особа з ростера цього тренера.

Це і є «підсвічування своїх учнів» із §8.7 бачення — сервер віддає ознаку,
клієнт лише фарбує.

**Прапорця `isMine` немає.** Учасник не має акаунта (Р9 бачення), тож
впізнати його сервер не може. Проєкція має підтримувати рівно одну ознаку —
не додавай другу «про запас».

**Розширена проєкція (`GET /competitions/:id/program/extended`)** — лише
організатор і адмін конкурсу. Додає до кожної позиції:
- `trackDurationSeconds` — фактична тривалість;
- `limitSeconds` — ліміт положення;
- `overlimitSeconds` — наскільки перевищено (0, якщо ні);
- `overlimitPaid` — чи оплачена доплата;
- `effectiveDurationSeconds` — що реально пішло в розрахунок.

**Чому це важливо:** саме за цією проєкцією друкують програму для
звукорежисера — він має бачити, який трек вимикати за лімітом, а який
оплачений і має грати повністю (§8.7).

- [ ] **Крок 1: Падаючі тести:** (а) неавторизований запит не містить `isMyStudent`; (б) тренер бачить `isMyStudent: true` рівно на виходах своїх учнів і `false` на чужих; (в) розширена проєкція для тренера → `403`; (г) виступ із перелімітом 15 с і оплатою має `overlimitSeconds: 15, overlimitPaid: true`.
- [ ] **Крок 2:** `npm test -- program-projections` — падає.
- [ ] **Крок 3:** реалізувати обидві проєкції.
- [ ] **Крок 4:** `npm test -- program-projections` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): public and extended program projections`

---

## Фаза 7 — Спеціальні категорії

### Task 16: Номінація з набором програм і кількістю виходів

Реалізує §8.3 бачення. Після Task 3 і Task 13 ця задача дешева — саме в цьому й був сенс принципу П2.

**Files:**
- Create: `backend/migrations/20260823091100-add-programs-to-nominations.ts`
- Modify: `backend/src/nominations/nomination.model.ts`
- Modify: `backend/src/nominations/dto/create-nomination.dto.ts`
- Modify: `backend/src/registrations/registrations.service.ts`
- Create: `backend/src/nominations/nomination-naming.ts` (чиста функція)
- Test: `backend/src/nominations/nomination-naming.spec.ts`

**Нові поля `nominations`:**
- `programIds` (ARRAY(UUID), default `[]`) — обрані програми/стилі з довідника осей.
- `exitMode` (ENUM(`single`,`per_program`), default `single`) — кількість виходів на сцену.
- `isSpecial` (BOOLEAN, default `false`) — спецкатегорія (Кубок, Корона, батл).

**Правило генерації виходів у `RegistrationsService.create`:**
```
exitMode === 'single'      → один Performance, programName = null
exitMode === 'per_program' → по одному Performance на кожен programId,
                             programName = назва програми
```

**Чиста функція `buildNominationLabel`:**
```ts
export function buildNominationLabel(input: {
  axisNames: string[];        // ['Юніори 1', 'Перші кроки']
  specialName: string | null; // 'Корона Шехеризади'
  programName: string | null; // 'Табла' або null
}): string;
```
Правила (прямо з документа замовника):
- `single`: `'Юніори 1 · Перші кроки · Корона Шехеризади'` — програма не згадується.
- `per_program`: `'Юніори 1 · Перші кроки · Корона Шехеризади · Імпровізація межансе'`,
  і нижче та сама категорія з наступною програмою — `'… · Табла'`.
- Роздільник — ` · `. Порожні частини відкидаються.

**Тривалість спецкатегорії:**
- `single` → сума `resolveLimit` по всіх `programIds`.
- `per_program` → ліміт кожної програми окремо для свого виходу.
Ця логіка додається в `resolveLimit` (Task 9) як окрема гілка.

**Ціна:** спецкатегорія має власну `price` на рівні номінації — окремого механізму не треба (§8.3, крок 6).

- [ ] **Крок 1: Падаючі тести `nomination-naming.spec.ts`:** три випадки з правил вище + випадок з порожнім `specialName`.
- [ ] **Крок 2:** `npm test -- nomination-naming` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4:** міграція + поля моделі + гілка генерації виходів.
- [ ] **Крок 5: Тест інтеграції:** заявка на спецкатегорію з `exitMode: 'per_program'` і трьома програмами створює 3 `Performance` з різними `programName`.
- [ ] **Крок 6:** `npm test -- nomination` — зелено.
- [ ] **Крок 7: Коміт** `feat(backend): special categories with programs and exit modes`

---

## Фаза 8 — Суддівство через бригади

### Task 17: Бригади, склад і призначення

Реалізує П4 — головний операційний виграш продукту.

**Files:**
- Create: `backend/migrations/20260823091200-create-judging-panels.ts`
- Create: `backend/src/judging/judging-panel.model.ts`
- Create: `backend/src/judging/panel-membership.model.ts`
- Create: `backend/src/judging/panel-assignment.model.ts`
- Create: `backend/src/judging/judging.service.ts`
- Create: `backend/src/judging/judging.controller.ts`
- Create: `backend/src/judging/judging.module.ts`
- Test: `backend/src/judging/judging.service.spec.ts`

**`judging_panels`:** `id`, `competitionId` (FK), `name` (STRING),
`venueId` (UUID, null, FK — бригада зазвичай відповідає майданчику),
`quorum` (INTEGER, null — якщо null, береться з правил конкурсу).

**`panel_memberships`:** `id`, `panelId` (FK), `judgeId` (FK → judges),
`isTrainee` (BOOLEAN, default false), `joinedAt` (DATE),
`leftAt` (DATE, null — заміна судді не видаляє рядок, а закриває його).

**`panel_assignments`:** `id`, `panelId` (FK), `nominationId` (FK).
Унікальний індекс `(panelId, nominationId)`.

**Ключове правило:** номінація призначається **бригаді**, ніколи не судді
напряму. Ендпоінта «призначити номінацію судді» не існує взагалі — саме це й
знімає біль із документа («в Юевенті адмін вручну виділяє категорії для кожного
судді»).

**Правила:**
- Одна номінація може бути призначена **не більш ніж одній** бригаді →
  спроба призначити другій дає `409` з назвою бригади, яка вже її має.
- Суддів у бригаді може бути **більше за кворум** (§8.9, крок 3) — обмеження зверху немає.
- Видалення бригади заборонене, якщо в неї є хоч один надісланий аркуш → `409`.

**Ендпоінти:**
- `POST /competitions/:id/panels`, `GET /competitions/:id/panels`, `DELETE /panels/:id`
- `POST /panels/:id/members` `{ judgeId, isTrainee }`
- `POST /panels/:id/assignments` `{ nominationIds: string[] }`
- `DELETE /panels/:id/assignments/:nominationId`

- [ ] **Крок 1: Падаючі тести:** (а) призначення номінації двом бригадам → `409`; (б) у бригаду можна додати 6 суддів при кворумі 3; (в) видалення бригади з надісланим аркушем → `409`.
- [ ] **Крок 2:** `npm test -- judging.service` — падає.
- [ ] **Крок 3:** міграції, моделі, сервіс, контролер.
- [ ] **Крок 4:** `npm test -- judging.service` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): judging panels with membership and assignments`

### Task 18: Кабінет судді, аркуш і кворум

**Files:**
- Create: `backend/migrations/20260823091300-create-score-sheets.ts`
- Create: `backend/src/judging/score-sheet.model.ts`
- Create: `backend/src/judging/score-entry.model.ts`
- Create: `backend/src/judging/sheet-validation.ts` (чиста функція)
- Modify: `backend/src/judging/judging.service.ts`
- Test: `backend/src/judging/sheet-validation.spec.ts`
- Test: `backend/src/judging/quorum.spec.ts`

**`score_sheets`:** `id`, `panelId` (FK), `judgeId` (FK), `nominationId` (FK),
`round` (ENUM(`final`,`semifinal`)), `status` (ENUM(`draft`,`submitted`)),
`isTrainee` (BOOLEAN), `submittedAt` (DATE, null).
Унікальний індекс `(judgeId, nominationId, round)`.

**`score_entries`:** `id`, `sheetId` (FK), `performanceId` (FK),
`score` (DECIMAL(4,1), null), `place` (INTEGER, null),
`absent` (BOOLEAN, default false).

**Чиста функція `validateSheet(entries, performanceCount)` — правила §8.10:**
```
1. Кожен неабсентний виступ має score в діапазоні [1, 10]. Інакше:
   'Бали обов'язкові для всіх учасників і мають бути від 1 до 10'
2. Місця (place) — необов'язкові. Але виставлені місця мають бути унікальними
   в межах аркуша. Інакше: 'Місце N вже виставлено іншому учаснику'  (інваріант 3)
3. Виступи з absent: true не мають ні score, ні place.
4. Кількість записів дорівнює кількості виходів у номінації.
```

**Чому бали обов'язкові, а місця ні:** рішення Р1 бачення — бали первинні,
місця лише тайбрейк.

**Правила надсилання (`POST /judge/sheets/:id/submit`):**
1. `validateSheet` має пройти, інакше `400` з конкретним повідомленням.
2. **Перевірка кворуму перед записом:** якщо кількість уже надісланих
   **не-стажерських** аркушів по цій `(nominationId, round)` `>= quorum` —
   `409` з повідомленням `'Кворум по цій номінації вже досягнуто'` (інваріант 4).
   Перевірка й запис — в одній транзакції з блокуванням, інакше двоє суддів
   проскочать одночасно.
3. Аркуші стажерів **ніколи не враховуються в кворумі** (інваріант 5) і не
   блокуються цією перевіркою — стажер може надіслати завжди.
4. Після досягнення кворуму номінація отримує похідний статус `judged` —
   він обчислюється, а не зберігається.

**Кабінет судді (`GET /judge/nominations`):**
- Повертає номінації, призначені бригадам, у яких цей суддя має **відкрите**
  членство (`leftAt IS NULL`).
- Кожна номінація — **згорнута**: `{ id, label, performanceCount, sheetStatus }`.
  Виходи не віддаються (§8.10, крок 1: «не розгорнуті, щоб не губитись»).
- `sheetStatus`: `'none' | 'draft' | 'submitted'`. Клієнт фарбує `'draft'`
  червоним — це ознака «затупив», §8.10, крок 7.
- `GET /judge/nominations/:id/sheet` — розгортає конкретну номінацію з переліком
  виходів (номер, ПІБ, студія) і чернеткою оцінок, якщо вона є.

**Автозбереження чернетки:** `PUT /judge/sheets/:id` зберігає `draft` без
валідації — суддя може заповнити половину й піти. Валідація лише при `submit`.

- [ ] **Крок 1: Падаючі тести `sheet-validation.spec.ts`:** бал 0 → помилка; бал 11 → помилка; два перших місця → помилка; місця взагалі не виставлені → валідно; absent зі скором → помилка.
- [ ] **Крок 2:** `npm test -- sheet-validation` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4: Падаючі тести `quorum.spec.ts`:** третій аркуш при кворумі 3 проходить; четвертий → `409`; аркуш стажера проходить і при досягнутому кворумі та не збільшує лічильник.
- [ ] **Крок 5:** реалізувати надсилання з транзакцією.
- [ ] **Крок 6:** `npm test -- judging` — зелено.
- [ ] **Крок 7: Коміт** `feat(backend): score sheets with quorum and trainee isolation`

### Task 19: Заміна судді посеред конкурсу

Окрема задача, бо це головний сценарій, заради якого існує бригада (§8.11).

**Files:**
- Modify: `backend/src/judging/judging.service.ts`
- Modify: `backend/src/judging/judging.controller.ts`
- Test: `backend/src/judging/judge-replacement.spec.ts`

**Interfaces:**
- Produces: `JudgingService.replaceJudge(panelId, outgoingJudgeId, incomingJudgeId, requesterId)`.

**Правила:**
1. Доступ — організатор або адмін конкурсу.
2. Членство того, хто виходить, **не видаляється**: йому проставляється
   `leftAt = now()`. Історія хто коли судив має лишитись.
3. Новому судді створюється членство з `joinedAt = now()`.
4. **Призначення номінацій не чіпаються взагалі** — вони на бригаді.
   Це вся суть задачі: жодних дій із категоріями.
5. **Уже надіслані аркуші того, хто вийшов, лишаються дійсними** (§8.11, крок 4)
   і далі рахуються в кворумі відсуджених номінацій.
6. Чернетки того, хто вийшов, лишаються його чернетками й **не переходять**
   до нового судді — оцінки персональні.
7. Новий суддя одразу бачить актуальний список у `GET /judge/nominations`,
   без жодних додаткових дій адміна.

**Ендпоінт:** `POST /panels/:id/replace-judge` `{ outgoingJudgeId, incomingJudgeId }`.

- [ ] **Крок 1: Падаючі тести:** (а) після заміни новий суддя бачить ті самі номінації, що бачив попередній; (б) надіслані аркуші попереднього далі враховуються в кворумі; (в) чернетка попереднього не видима новому; (г) `panel_assignments` не змінились (порівняти до і після).
- [ ] **Крок 2:** `npm test -- judge-replacement` — падає.
- [ ] **Крок 3:** реалізувати метод і ендпоінт.
- [ ] **Крок 4:** `npm test -- judge-replacement` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): replace judge without touching assignments`

---

## Фаза 9 — Результати

### Task 20: Зведення результатів

**Files:**
- Create: `backend/src/results/results-aggregation.ts` (чиста функція)
- Create: `backend/src/results/results.service.ts`
- Create: `backend/src/results/results.controller.ts`
- Create: `backend/src/results/results.module.ts`
- Test: `backend/src/results/results-aggregation.spec.ts`

**Interfaces:**
```ts
export interface JudgeVote { judgeId: string; score: number; place: number | null; }
export interface PerformanceVotes { performanceId: string; absent: boolean; votes: JudgeVote[]; }
export interface RankedResult {
  performanceId: string;
  totalScore: number;
  placesSum: number | null;
  finalPlace: number | null;   // null для absent
  judgeVotes: JudgeVote[];
}
export function aggregateResults(input: PerformanceVotes[]): RankedResult[];
```

**Алгоритм — рішення Р1 бачення:**
```
1. Виступи з absent: true виключаються з ранжування, finalPlace = null,
   у відповіді лишаються з позначкою.
2. totalScore = сума score усіх суддів (аркуші стажерів сюди НЕ потрапляють —
   їх відсіює сервіс до виклику функції, інваріант 5).
3. Сортування за totalScore за спаданням.
4. ТАЙБРЕЙК при рівних totalScore: менша сума виставлених суддями місць
   (placesSum) вище. Виступи без жодного місця отримують placesSum = null і
   при рівності стають нижче за тих, у кого місця є.
5. Якщо після тайбрейку виступи досі рівні — вони ділять місце:
   обидва отримують те саме finalPlace, наступний пропускає номер
   (1, 2, 2, 4 — стандартна змагальна нумерація).
```

**Ендпоінти:**
- `GET /competitions/:id/results` — публічно, лише по номінаціях, що досягли
  кворуму. Формат рядка: `{ participant, judgePlaces: {judgeId: place}, finalPlace }`
  — саме така таблиця описана в документі: колонка на кожного суддю з місцем,
  вкінці загальне місце (§8.13).
- `GET /competitions/:id/results/:nominationId/scores?judgeId=` — бали
  конкретного судді. Це те, що розкривається при кліку на місце (§8.13, крок 4).
- `GET /competitions/:id/results/search?q=` — **публічно**, пошук за прізвищем
  або наскрізним номером по всіх відсуджених номінаціях конкурсу. Повертає
  виступи людини з її місцями. Учасник не має акаунта (Р9 бачення), тож це
  єдиний спосіб знайти себе серед сотень рядків (§8.13, крок 5).
  Пошук за `q` коротшим за 2 символи → порожній результат, без помилки.
- `GET /coach/results?competitionId=` — **лише роль `coach`**: зведення по всіх
  учасниках із ростера цього тренера в цьому конкурсі — номінація, місце, сума
  балів (§8.13, крок 6). Це єдине персоналізоване подання результатів у системі.
- `GET /competitions/:id/results/trainees` — **лише організатор**: аркуші
  стажерів поруч із основними, щоб порівняти збіг (§8.10).

- [ ] **Крок 1: Падаючі тести `results-aggregation.spec.ts`:** (а) три судді, різні бали → порядок за сумою; (б) рівні бали, різні суми місць → тайбрейк спрацював; (в) повна рівність → обидва отримали 2-ге місце, наступний 4-те; (г) absent не потрапив у ранжування; (д) порожній вхід → порожній вихід.
- [ ] **Крок 2:** `npm test -- results-aggregation` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4:** `npm test -- results-aggregation` — зелено.
- [ ] **Крок 5:** реалізувати сервіс і п'ять ендпоінтів. Тести: стажери відсіяні з підсумку; пошук за прізвищем знаходить усі виступи людини; пошук за `q` з одного символу → порожньо; `GET /coach/results` для ролі `organizer` → `403`.
- [ ] **Крок 6: Коміт** `feat(backend): aggregate results with score-first ranking`

---

## Фаза 10 — Оплати

### Task 21: Нарахування, статуси й частка керівника

**Files:**
- Create: `backend/migrations/20260823091400-create-charges.ts`
- Create: `backend/migrations/20260823091500-drop-entries.ts`
- Create: `backend/src/billing/charge.model.ts`
- Create: `backend/src/billing/billing.service.ts`
- Create: `backend/src/billing/billing.controller.ts`
- Create: `backend/src/billing/billing.module.ts`
- Create: `backend/src/billing/overlimit-pricing.ts` (чиста функція)
- Delete: `backend/src/entries/` (уся тека)
- Test: `backend/src/billing/overlimit-pricing.spec.ts`
- Test: `backend/src/billing/billing.service.spec.ts`

**`charges`:** `id`, `competitionId` (FK), `registrationId` (FK),
`performanceId` (UUID, null — заповнено лише для перелімітних),
`type` (ENUM(`participation`,`overlimit`)), `amount` (DECIMAL(10,2)),
`status` (ENUM(`pending`,`paid`,`waived`), default `'pending'`),
`paidAt` (DATE, null), `markedByUserId` (UUID, null).

**Чиста функція `overlimitPrice(overlimitSeconds, tariffs)`:**
```
tariffs відсортовані за uptoSeconds за зростанням, напр. [{30,150},{60,200}]
overlimitSeconds <= 0            → 0
знайти перший тариф з uptoSeconds >= overlimitSeconds → його price
перевищує найбільший тариф       → price найбільшого тарифу
                                   (пропорційно НЕ множимо — документ дає
                                    сходинки, не формулу)
```

**Правила `BillingService`:**
1. Нарахування за участь створюється при подачі заявки, `amount = nomination.price ?? 0`.
2. Нарахування за переліміт створюється/оновлюється при завантаженні треку
   (Task 10) і **лише якщо `rules.surchargesEnabled === true`**.
3. Перезавантаження треку **перераховує** перелімітне нарахування. Якщо новий
   трек уміщається в ліміт — нарахування видаляється, але **лише якщо воно ще
   `pending`**. Уже оплачене → переводиться в `waived` зі слідом, гроші не зникають самі.
4. `PATCH /charges/:id` `{ status }` — ручна зміна статусу організатором
   (§8.8, крок 4: гроші часто приходять поза системою). Записує `markedByUserId` і `paidAt`.
5. Вимкнення `surchargesEnabled` **не видаляє** вже створені перелімітні
   нарахування — лише припиняє створення нових (інваріант 8: заднім числом не переписуємо).
6. `GET /competitions/:id/charges` — зведений список для організатора:
   учасник, номер, номінація, обидва види нарахувань, статуси. Це «загальний
   список учасників, де видно всі оплати» з документа.
7. `GET /competitions/:id/coach-payouts` — частка кожного тренера:
   `сума оплачених participation-нарахувань його учасників × rules.coachPercent / 100`.
   Перелімітні нарахування у частку **не входять** — це компенсація витрат
   організатора, а не внесок.

**Дроп `entries`:** окремою міграцією, останнім кроком фази. До неї —
переконатись, що жоден файл у `backend/src` не імпортує `Entry`:
`grep -r "entries/entry.model" backend/src` має бути порожнім.

- [ ] **Крок 1: Падаючі тести `overlimit-pricing.spec.ts`:** 0 с → 0; 15 с → 150; 30 с → 150; 45 с → 200; 90 с → 200 (стеля).
- [ ] **Крок 2:** `npm test -- overlimit-pricing` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4: Падаючі тести `billing.service.spec.ts`:** (а) заявка створює participation-нарахування; (б) переліміт при вимкнених доплатах не створює нарахування; (в) заміна треку на коротший видаляє `pending`-нарахування; (г) оплачене нарахування при заміні треку стає `waived`, не зникає; (д) `coach-payouts` не враховує перелімітні.
- [ ] **Крок 5:** реалізувати сервіс і ендпоінти.
- [ ] **Крок 6:** видалити теку `entries`, оновити `app.module.ts`, перевірити `grep`, написати міграцію дропу.
- [ ] **Крок 7:** `npm test && npm run lint && npx tsc --noEmit` — усе зелене.
- [ ] **Крок 8: Коміт** `feat(backend): charges, manual payment status and coach payouts`

---

## Фаза 11 — Тури й відбори

### Task 22: Півфінал і формування фіналу

Реалізує §8.12 бачення. **Увага:** механізм відбору позначений як У1 — потребує підтвердження замовника. Реалізуємо запропонований варіант, лишаючи точку розширення.

**Files:**
- Create: `backend/src/rounds/rounds.service.ts`
- Create: `backend/src/rounds/rounds.controller.ts`
- Create: `backend/src/rounds/rounds.module.ts`
- Create: `backend/src/rounds/qualification.ts` (чиста функція)
- Test: `backend/src/rounds/qualification.spec.ts`

**Interfaces:**
```ts
export function selectQualifiers(
  ranked: RankedResult[],   // з Task 20
  topK: number,
): string[];                // performanceIds, що проходять у фінал
```

**Правила:**
1. При подачі заявки нічого не змінюється — усі виходи створюються з `round: 'final'`.
2. **Увімкнення півфіналу — явна дія організатора**, не автоматична:
   `POST /competitions/:id/nominations/:nominationId/enable-semifinal`.
   Система підказує це робити, коли кількість заявок перевищила
   `rules.semifinalThreshold`, але не робить сама. Причина: автоматичне
   переведення посеред відкритої реєстрації несподівано подвоїло б програму.
3. При увімкненні всі наявні виходи цієї номінації переводяться на
   `round: 'semifinal'`. Ліміти тривалості беруться з `duration_limits`
   із `round: 'semifinal'` (Task 9).
4. Півфінальні виходи ставляться в програму й судяться **звичайним флоу** —
   ні `ProgramService`, ні `JudgingService` не мають жодної гілки «якщо півфінал».
   Це і є перевірка П6.
5. `POST /competitions/:id/nominations/:nominationId/build-final` `{ topK, performanceIds? }`:
   - якщо `performanceIds` не передано — беруться `selectQualifiers(ranked, topK)`;
   - якщо передано — беруться вони (організатор скоригував склад вручну);
   - для кожного створюється **новий** `Performance` з `round: 'final'`,
     тією самою `registrationId` і тим самим треком;
   - півфінальні виходи лишаються з їхніми результатами — історія не переписується.
6. `selectQualifiers` бере перших `topK` за `finalPlace`. **При поділеному
   місці на межі проходять усі, хто його поділив** — тобто фактична кількість
   може бути більшою за `topK`. Інше рішення (відсікати за жеребом) було б
   несправедливим.

**Позначка в коді:** над `selectQualifiers` — коментар з посиланням на §13-У1
бачення і переліком трьох невирішених питань (топ-K чи поріг балів; чи той
самий склад бригади; чи враховуються бали півфіналу в підсумку).

- [ ] **Крок 1: Падаючі тести `qualification.spec.ts`:** (а) topK=6 з 12 учасників → 6; (б) на 6-му місці двоє поділили → проходять 7; (в) topK більший за кількість учасників → проходять усі; (г) absent не проходить ніколи.
- [ ] **Крок 2:** `npm test -- qualification` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4:** реалізувати сервіс і два ендпоінти.
- [ ] **Крок 5: Тест П6:** сформувати відділення з півфінальних виходів і переконатись, що `ProgramService` не має жодної згадки `semifinal` — `grep -c "semifinal" backend/src/program/` має дати 0.
- [ ] **Крок 6:** `npm test` — усе зелене.
- [ ] **Крок 7: Коміт** `feat(backend): semifinal round and final qualification`

---

## Фаза 12 — Життєвий цикл і огляд

### Task 23: Дні конкурсу і стани конкурсу

Закриває §7 бачення (наскрізні стани) і дає CRUD для `competition_days`, таблиця яких створена в Task 12, але без ендпоінтів.

**Files:**
- Create: `backend/migrations/20260823091600-add-status-to-competitions.ts`
- Create: `backend/src/program/competition-days.controller.ts`
- Create: `backend/src/program/competition-days.service.ts`
- Modify: `backend/src/competitions/competition.model.ts`
- Modify: `backend/src/competitions/competitions.service.ts`
- Create: `backend/src/competitions/competition-status.ts` (чиста функція)
- Test: `backend/src/competitions/competition-status.spec.ts`

**Нове поле `competitions.status`:**
`ENUM('draft','published','registration_open','registration_closed','scheduled','running','finished')`,
default `'draft'`.

**Чиста функція переходів:**
```ts
export function canTransition(from: Status, to: Status): boolean;
```
Дозволені переходи — рівно ті, що в §7 бачення, і тільки вперед:
```
draft → published → registration_open → registration_closed
      → scheduled → running → finished
```
Плюс два винятки, потрібні на практиці:
- `registration_closed → registration_open` (організатор відкрив прийом ще раз);
- будь-який стан → `draft` **заборонено** — опублікований конкурс не ховається.

**Що змінює кожен перехід:**
- `published` — конкурс з'являється в публічному списку. Вимагає заповнених
  `name`, `dateFrom`, `dateTo`, `location`; інакше `400` з переліком порожніх полів.
- `registration_open` — `POST /registrations` починає приймати заявки.
  Перевірка дат із Task 6 лишається додатковою, не замість статусу.
- `registration_closed` — склад заявок заморожений; нові заявки → `403`.
- `scheduled` — вимагає, щоб не лишилось нерозподілених виходів; інакше `409`
  з лічильником: `'Не розподілено 12 виступів'`.
- `finished` — відкриває публічні результати (Task 20 перевіряє цей статус).

**Дні конкурсу:**
- `POST /competitions/:id/days` `{ date, label? }` — дата має потрапляти в
  діапазон `dateFrom..dateTo`, інакше `400`.
- `GET /competitions/:id/days`, `DELETE /days/:id`.
- Видалення дня з відділеннями → `409`.
- При створенні конкурсу дні **створюються автоматично** на кожну дату
  діапазону `dateFrom..dateTo` — організатор із одноденним конкурсом ніколи
  не має думати про це поняття.

- [ ] **Крок 1: Падаючі тести `competition-status.spec.ts`:** `draft → running` заборонено; `registration_closed → registration_open` дозволено; будь-що → `draft` заборонено.
- [ ] **Крок 2:** `npm test -- competition-status` — падає.
- [ ] **Крок 3:** реалізувати чисту функцію.
- [ ] **Крок 4: Падаючі тести сервісу:** публікація без `location` → `400`; перехід у `scheduled` з нерозподіленими → `409`; створення дводенного конкурсу створює 2 дні.
- [ ] **Крок 5:** міграція, ендпоінти днів, `PATCH /competitions/:id/status`.
- [ ] **Крок 6:** `npm test` — зелено.
- [ ] **Крок 7: Коміт** `feat(backend): competition lifecycle and days`

### Task 24: Огляд суперадміна

Закриває §8.14 бачення.

**Files:**
- Create: `backend/src/admin-overview/admin-overview.controller.ts`
- Create: `backend/src/admin-overview/admin-overview.service.ts`
- Create: `backend/src/admin-overview/admin-overview.module.ts`
- Create: `backend/src/auth/roles.guard.ts`
- Test: `backend/src/admin-overview/admin-overview.service.spec.ts`

**`RolesGuard`:** читає роль із JWT, порівнює з метаданими `@Roles('superadmin')`.
Усі ендпоінти цього модуля закриті `@Roles('superadmin')`.

**Ендпоінти:**
- `GET /admin/competitions` — усі конкурси всіх організаторів: назва, організатор,
  дати, статус, кількість заявок, кількість відсуджених номінацій,
  сума нарахувань. Пагінація `?page=&limit=` (default 25), сортування за `dateFrom` спадно.
- `GET /admin/coaches` — усі керівники: прізвище, ім'я, місто, студія, телефон,
  кількість конкурсів і учасників. Це дослівно перелік із документа замовника.
  Пошук `?q=` по прізвищу і студії.

**Обмеження:** модуль **тільки читає**. Жодних мутацій — суперадмін не
редагує чужі конкурси. Якщо це знадобиться, це буде окреме рішення з окремим
слідом у логах.

- [ ] **Крок 1: Падаючі тести:** роль `organizer` на `/admin/competitions` → `403`; `superadmin` бачить конкурси всіх організаторів; пошук по студії звужує список керівників.
- [ ] **Крок 2:** `npm test -- admin-overview` — падає.
- [ ] **Крок 3:** реалізувати guard, сервіс, контролер.
- [ ] **Крок 4:** `npm test` — зелено.
- [ ] **Крок 5: Коміт** `feat(backend): superadmin overview`

---

## Фінальна перевірка

- [ ] `npm test` — усі спеки зелені.
- [ ] `npm run lint` — без помилок.
- [ ] `npx tsc --noEmit` — без помилок.
- [ ] `npm run migrate:undo:all && npm run migrate` — повний цикл міграцій робочий в обидва боки.
- [ ] `grep -r "entries/entry.model" backend/src` — порожньо.
- [ ] Перевірити кожен інваріант із §9 бачення проти коду; для кожного має існувати або обмеження БД, або тест.
