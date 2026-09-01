# DanseFest Backend — таски

**Мета:** серверна частина ядра змагання — від акаунтів і довідника номінацій до розщеплення плоскої заявки, програми фестивалю, оплат і публічного каталогу. Суддівство й результати винесені у відкладену хвилю.

**Стек:** NestJS 11, Sequelize 6 + sequelize-typescript, PostgreSQL, sequelize-cli (міграції в `backend/migrations/`, конфіг `backend/src/config/database.js`), class-validator для DTO, passport-jwt.

**Spec:** `docs/superpowers/specs/2026-08-18-danse-fest-technical-vision-design.md`
**Парний план:** `docs/superpowers/plans/2026-08-18-danse-fest-frontend.md`

**Як читати таск:** `should contain` — перелік колонок таблиці. `Related to` — з якими таблицями зв'язок. `Готово, коли` — критерії приймання: те, що перевіряється кліком або запитом, а не станом коду.

## Глобальні обмеження

- PK — `UUID` з `defaultValue: DataTypes.UUIDV4`.
- Кожна міграція має робочий `down`. Формат імені: `YYYYMMDDHHmmss-опис.ts`, за зразком `20260822090100-create-template-nominations.ts`.
- Таблиці — `snake_case` множина, поля — `camelCase` (так уже в проєкті).
- Кожна таблиця має `createdAt` і `updatedAt` (`allowNull: false`).
- FK — з `onDelete: 'CASCADE', onUpdate: 'CASCADE'`, крім явно зазначених.
- Гроші — `DECIMAL(10, 2)`. Тривалості — цілі **секунди** (`INTEGER`), ніколи не float.
- **Час виступу ніколи не приймається з клієнта** — тільки обчислюється (інваріант 2).
- Ніяких magic numbers і magic strings: усі пороги, ліміти й ключі — іменовані константи в окремих файлах.
- Коментарі — українською, лише там, де пояснюють *чому*.

---

## Фаза 1 — Акаунти

### BE-1 (було BE-1): Merge admins into users with roles

**Table `users`** (перейменування з `admins`) should contain:
{id, name, email, password, role, city, studioName, phone, phoneVerified}

- `role` — `ENUM('superadmin','organizer','coach','participant')`, not null, default `'organizer'`.
- `phone` — not null для нових записів, **unique**: за ним учасник входить у кабінет.
- `phoneVerified` — BOOLEAN, default `false`.
- `studioName` — обов'язкова для `organizer` і `coach`, nullable для решти.

**Related to:** `competitions` через `competition_admins` (`adminId` → `userId`); `judges` отримує `userId` (null, `SET NULL`) і далі не чіпається.

**Правила:** `POST /auth/register` приймає лише `organizer | coach | participant`. Пароль лишається — OTP його не заміняє, а додається.

**Готово, коли:**
- [ ] Реєстрація з роллю `coach` без `studioName` → `400`.
- [ ] Спроба зареєструватись як `superadmin` → `400`.
- [ ] Наявні адміни після міграції — `organizer`, доступ до конкурсів не втрачено.
- [ ] Другий користувач із тим самим телефоном відхиляється БД.

### BE-2 (нове): Phone verification via SMS OTP

**Table `otp_codes`** should contain:
{id, userId, phone, codeHash, expiresAt, attempts, consumedAt}

**Endpoints:**
- `POST /auth/register` → `201 { userId, otpRequired: true }` — токенів не видає.
- `POST /auth/otp/send { userId, phone }` → `{ sentAt, expiresIn: 300, retryAfter: 60 }`
- `POST /auth/otp/verify { userId, code }` → `{ token, refreshToken, user }`

**Правила:** код 4 цифри, у БД лише хеш, TTL 5 хв; не більше 3 надсилань на номер за 15 хв (`429` з `retryAfter`); 5 невдалих спроб — код згорає (`400 OTP_EXPIRED`); успішна перевірка ставить `phoneVerified = true` і `consumedAt`; провайдер SMS — за інтерфейсом `SmsSender`, у dev-режимі пише код у лог.

**Готово, коли:**
- [ ] Без підтвердження номера логін віддає `{ otpRequired, userId }`, а не токени.
- [ ] Четверте надсилання за 15 хв → `429`.
- [ ] Прострочений код → `400 OTP_EXPIRED`, у БД не лишається чистого коду.

### BE-3 (нове): Login by email or phone, password reset

**Endpoints:** `POST /auth/login { login, password }` (email або телефон) → `{ token, refreshToken, user }` або `{ otpRequired, userId }`; `POST /auth/refresh`; `POST /auth/password/reset { email }`; `POST /auth/password/confirm { token, password }`; `GET /me` → `{ id, name, email, phone, role, studioName, personId?, permissions[] }`.

**Правила:** `login` розпізнається за наявністю `@`; телефон нормалізується до E.164 перед пошуком; `GET /me` віддає `personId` прив'язаної Особи — з нього кабінет учасника розуміє, чи заповнений профіль.

**Готово, коли:**
- [ ] Вхід тим самим паролем працює і за email, і за телефоном у будь-якому форматі запису.
- [ ] `GET /me` для учасника без Особи віддає `personId: null`, не помилку.

---

## Фаза 2 — Довідник номінацій

### BE-4 (нове): Axis catalogue with age ranges and lineup axis

**Table `axes`** (осі довідника) should contain:
{id, code, name, sortOrder}

- `code` — `ENUM('age','style','level','lineup')`: Вік, Стиль, Ліга, Склад.

**Table `axis_values`** should contain:
{id, axisId, label, ageFrom, ageTo, sortOrder}

- `ageFrom`, `ageTo` — INTEGER, null для всіх осей, крім `age`; для `age` — not null.

**Table `nomination_templates`** should contain: {id, name, ownerId}

**Table `template_axis_values`** should contain: {id, templateId, axisValueId} — unique `(templateId, axisValueId)`.

**Table `template_specials`** should contain: {id, templateId, name}

**Endpoints:** `GET /templates?q`, `GET /templates/:id`, `POST /templates`, `PUT /templates/:id`, `DELETE /templates/:id` (`409 TEMPLATE_IN_USE`).

**Правила:**
- У шаблоні немає цін — жодної колонки. Ціни живуть у конкурсі (BE-5).
- Валідація осі `age`: `ageFrom <= ageTo`, діапазони значень одного шаблону не перетинаються → `400` з переліком конфліктних пар. Без цього автовизначення категорії неоднозначне.
- Вісь `lineup` завжди отримує чотири значення за замовчуванням: Соло, Дуо, Тріо, Групові.
- Чиста функція `resolveAgeCategory(birthDate, templateAgeValues, referenceDate) → axisValue | null`: повний вік на `referenceDate` (дату початку конкурсу, не «сьогодні»), потім перше значення, де `ageFrom <= age <= ageTo`. Немає збігу → `null` і повідомлення `'Вік учасника не підпадає під жодну вікову категорію цього конкурсу'`.

**Готово, коли:**
- [ ] Шаблон із діапазонами 9–12 і 12–15 → `400` про перетин.
- [ ] Дитина 2018 р. н. на конкурс 2026-09-20 отримує категорію 8 років, а не 7.
- [ ] Видалення використаного шаблону → `409`.

### BE-5 (нове): Generate contest nominations with prices

**Нові поля `nominations`:** {templateId, parts, price, isSpecial, venueId, sortOrder}

- `parts` — JSONB `{ age, style, level, lineup }` з `label` кожної осі; за ним працює підбір у заявці.

**Endpoints:**

`POST /competitions/:id/nominations/generate`
```ts
{ templateId,
  selected: { [axisCode]: axisValueId[] },
  prices: { "level:<id>": 450, "lineup:<id>": 700 } }
→ { nominations: [{ id, label, parts, price }] }
```

- `PUT /competitions/:id/nominations` — ручні правки: назва, ціна, майданчик, порядок.
- `POST /competitions/:id/nominations/specials { name, price, programIds?, exitMode? }`
- `DELETE /competitions/:id/nominations/:nominationId` → `409 NOMINATION_HAS_REGISTRATIONS`.

**Правила:**
- Генерація — декартів добуток вибраних значень. Порядок частин у назві: Вік · Стиль · Ліга · Склад, роздільник `·`, порожні частини відкидаються.
- Ціни приходять разом із генерацією, до її виконання. Чиста функція `resolvePrice(parts, priceMap)`: ціна за `lineup` перемагає ціну за `level`; немає ні тієї, ні тієї → `null`.
- Організатор не може створювати нові значення осей — `selected` приймає лише `axisValueId`, що входять у `template_axis_values` цього шаблону, інакше `400 VALUE_NOT_IN_TEMPLATE`.
- Повторна генерація не дублює: наявні номінації з тим самим `parts` оновлюють ціну, нові додаються, зайві без заявок видаляються, зайві із заявками лишаються з попередженням у відповіді.

**Готово, коли:**
- [ ] 2 віки × 3 стилі × 2 ліги × 4 склади дають 48 номінацій із цінами.
- [ ] Номінація «Дуо» у лізі Debut отримує ціну складу, не ліги.
- [ ] `axisValueId` поза шаблоном → `400`.
- [ ] Повторна генерація зі зміненими цінами не створює других копій.

---

## Фаза 3 — Розщеплення заявки

### BE-6 (було BE-2): Create Person table

**Table `persons`** should contain:
{id, lastName, firstName, middleName, birthDate, city, studioName, phone, userId}

- `lastName`, `firstName`, `birthDate` — обов'язкові при створенні через API. У БД `birthDate` лишається nullable лише щоб пережити міграцію старих `entries` (BE-9); сервіс на створення вимагає її завжди.
- `phone` — null, **unique**: за ним учасник згодом прив'язує акаунт.
- `userId` — null, **unique**, `SET NULL`.
- Поля `league` не існує — ліга живе в заявці.

**Індекси:** `(lastName, firstName)`, `studioName`, unique на `userId`, unique на `phone`.

**Готово, коли:**
- [ ] `POST` без `birthDate` → `400` (без неї не визначити вікову категорію).
- [ ] Другий `userId` або другий `phone` з тим самим значенням відхиляється БД.
- [ ] Міграція старих даних без дати народження проходить.

### BE-7 (було BE-3): Registration, participants and performances

**Table `registrations`** should contain:
{id, competitionId, nominationId, routineName, coachId, submittedByUserId, choreographer, studioName, city, level, ageCategory, improv, status}

- `level` — рядок, not null: ліга цієї заявки, скопійована з `nomination.parts.level` на момент подання. Денормалізація свідома: ліміти часу, доплати й фільтри читають її мільйон разів, а історична ліга не має змінитись від правок довідника.
- `ageCategory` — рядок, not null: вікова категорія, обчислена `resolveAgeCategory` при поданні. Зберігається з тієї ж причини.
- `status` — `ENUM('draft','submitted','confirmed','cancelled')`, default `'submitted'`.

**Table `registration_participants`** should contain: {id, registrationId, personId} — unique `(registrationId, personId)`.

**Table `performances`** should contain: {id, registrationId, competitionId, programName, round, status} — `round` default `'final'`, `status` default `'scheduled'`.

**Готово, коли:**
- [ ] Груповий номер із 5 осіб — одна заявка з п'ятьма рядками складу.
- [ ] Заявка несе лігу й вікову категорію рядками; зміна довідника після подання їх не змінює.
- [ ] Повний цикл міграцій робочий в обидва боки.

### BE-8 (було BE-4): Per-competition participant number

Без змін. `competition_participant_numbers` {id, competitionId, personId, number}, unique `(competitionId, personId)` і `(competitionId, number)`, видача в транзакції з `FOR UPDATE`, одна повторна спроба при конфлікті, потім `409`.

**Готово, коли:**
- [ ] Одна особа, дві заявки в одному конкурсі → один номер.
- [ ] Дві особи → 1 і 2. Та сама особа у двох конкурсах → номери незалежні.

### BE-9 (було BE-5): Migrate entries into persons and registrations

Правила ті самі, з трьома поправками:

- `entries.league` → `registrations.level`. На `persons` не переноситься.
- `registrations.ageCategory` — з `nominations.parts.age`, якщо номінацію знайдено; інакше `'—'`.
- `persons.birthDate` лишається `null` для перенесених — це єдине джерело записів без дати.

**Готово, коли:**
- [ ] `count(registrations) = count(entries)`; `count(persons)` = кількість унікальних людей.
- [ ] Жоден перенесений `person` не має ліги.
- [ ] `migrate:undo` лишає `entries` недоторканою.

### BE-10 (було BE-6): Submit one registration across many nominations

Найважливіший ендпоінт. Змінено вхід: клієнт передає **стилі**, не номінації.

**Крок 1 — опції форми.** `GET /competitions/:id/registration-options?personId=`

```ts
{ levels: [{id,label}],            // ліги цього конкурсу
  styles: [{id,label}],            // стилі цього конкурсу
  lineups: [{id,label}],
  ageCategory: { id, label } | null,   // обчислена з birthDate
  studioName, coachName,               // автопідстановка з тренера особи
  matched: [{ styleId, nominationId, label, price }] }
```

`matched` перераховується під передану `level` (query `?level=`): для кожного стилю знаходиться номінація з тими самими лігою, віковою категорією і складом. Це те, що дає інтерфейсу підставити номінації самому.

**Крок 2 — створення.** `POST /competitions/:competitionId/registrations`

```ts
{ participants: [{ personId } | { lastName, firstName, birthDate, phone? }],
  level: string,                  // ліга — обов'язково, обирається в заявці
  styleIds: string[],             // кілька стилів за одну дію
  lineupId: string,
  routineName?, choreographer?, studioName?, city?, improv? }
→ 201 { registrations: [{ id, nominationId, label, number, price }], totalDue }
```

**Правила:**
- Реєстрація відкрита (`registrationFrom <= сьогодні <= registrationTo` і статус конкурсу дозволяє), інакше `403 REGISTRATION_CLOSED`.
- `level` обов'язковий → без нього `400 'Оберіть лігу для цієї заявки'`. Ліга не підтягується з Особи — її там немає.
- Вікова категорія обчислюється `resolveAgeCategory` за `birthDate` і датою початку конкурсу. Для групового складу береться **найстарший** учасник. Категорії не знайдено → `422` з повідомленням про вік.
- Номінація на кожен стиль знаходиться за (стиль + `level` + вікова категорія + склад). Немає такої номінації → `422 'У цьому конкурсі немає номінації для обраного поєднання'` зі списком стилів, що не зійшлись.
- Одна `Registration` на кожен знайдений стиль, з тим самим складом — одна дитина в 3 стилі одним запитом.
- `price` — з номінації. `studioName` і `choreographer` — з тренера Особи, якщо клієнт їх не передав.
- Наскрізний номер кожній особі складу (BE-8); виходи — за `exitMode` номінації (BE-22).
- Уся операція в **одній транзакції**.
- **Два шляхи подання:** `coach` → `coachId` = він сам; `participant` → `coachId = null`, `participants` ігнорується, складом є Особа з `persons.userId = поточний`; без прив'язаної Особи → `409 'Спочатку заповніть свій профіль учасника'`.
- **Дублікати не блокуються.** Жодного унікального індексу на `(nominationId, склад)` і жодної перевірки «про всяк випадок»: вона мусила б вгадувати, чи тезки — одна людина, і помилялась би в обидва боки. Розгрібає організатор, обидва внески нараховуються.

**Право власності** — одна функція `assertRegistrationOwner(registration, user)`, спільна для цього таска, BE-15 (трек) і BE-23 (рахунок). Редагують автор, організатор і адмін конкурсу. Тренер не чіпає самостійну заявку учня, учень — заявку тренера.

**Скасування** `DELETE /registrations/:id`: `status → 'cancelled'`, виходи → `'withdrawn'`; якщо якийсь уже у відділенні — у відповіді `{ requiresScheduleRecalculation: true }`.

**Читання** `GET /competitions/:id/registrations?q=&level=&nominationId=&status=&page=`: організатор — усі; тренер — подані ним; учасник — усі, де є його Особа, незалежно від того, хто подав. Рядок несе `canEdit`, `submittedByName`, `level`, `ageCategory`, `price`, `hasTrack`.

**Готово, коли:**
- [ ] Одна дитина, 3 стилі, одна ліга → 3 заявки, 3 виходи, 3 номери, один запит.
- [ ] Та сама дитина з іншою лігою в іншій заявці — обидві живуть, ліги різні.
- [ ] Запит без `level` → `400` з читабельним повідомленням.
- [ ] Дитина 7 років на конкурс, де мінімальна категорія 9–12 → `422`, не тихий `null`.
- [ ] Помилка на третьому стилі відкочує перші два.
- [ ] Заявка від `participant` має `coachId = null` і склад із власної Особи.
- [ ] Ціна в заявці збігається з ціною номінації, навіть якщо клієнт прислав свою.

---

## Фаза 4 — Ростер і дедуплікація

### BE-11 (було BE-7): Coach roster

Без змін. `coach_roster_entries` {id, coachId, personId}, unique `(coachId, personId)`; поповнення автоматичне при першій заявці; `DELETE /roster/:personId` знімає лише рядок ростера; заборона видалення при активній заявці → `409`; `GET /roster` із `lastRegisteredAt`.

**Додано:** `GET /roster` віддає `age` кожної особи — інтерфейс показує його поруч із іменем при виборі учасника.

### BE-12 (було BE-8): Candidate matching, account claim, manual merge

Ваги перераховані — дата народження тепер є завжди, тож вона важить більше за студію:

```
ПІБ збігається (trim, без регістру)                 → +50
birthDate збігається                                 → +30
birthDate НЕ збігається                              → -60
studioName збігається                                → +20
coachId збігається (особа в ростері того тренера)    → +20
city збігається                                      →  +5
результат = clamp(0, 100), показуємо score >= 60
```

Автоматичне злиття не робиться **ніколи**, навіть при 100.

Решта без змін: `POST /persons/:id/claim` (`409`, якщо Особа або акаунт уже прив'язані), `DELETE /persons/:id/claim` — лише організатор і суперадмін, `POST /persons/:targetId/merge { sourceId, confirm }` із перевішуванням складу, ростера й номерів, конфлікт номерів на користь цілі, злиття двох Осіб з різними акаунтами → `409`.

**Готово, коли:**
- [ ] Однакові ПІБ і дата → 80 (показується); однакові ПІБ, різна дата → нижче порогу.
- [ ] `claim` на прив'язану Особу → `409`; відв'язка недоступна `participant`.
- [ ] Після злиття номер, ростер і всі заявки джерела в цілі.

---

## Фаза 5 — Конкурс: правила й майстер

### BE-13 (було BE-9): Competition rules entity

**Table `competition_rules`** (один рядок на конкурс):

| Поле | Тип | Default | Що означає |
|---|---|---|---|
| `pauseSeconds` | INTEGER | 20 | технічна пауза після виступу |
| `timeSource` | ENUM(track,limit) | limit | як рахувати час при вимкнених доплатах |
| `surchargesEnabled` | BOOLEAN | false | вимикач доплат за переліміт |
| `coachPercent` | DECIMAL(5,2) | 0 | відсоток керівника |
| `improvGroupSeconds` | INTEGER | 60 | загальний захід імпровізації |
| `improvIndividualSeconds` | INTEGER | 30 | індивідуальний захід |
| `trackUploadUntil` | DATEONLY | null | дедлайн завантаження музики |
| `semifinalThreshold` | INTEGER | 12 | (для відкладеної фази) |
| `quorum` | INTEGER | 3 | (для відкладеної фази) |

**Table `overlimit_tariffs`**: {id, competitionId, uptoSeconds, price} — сходинки {30, 150}, {60, 200}.

**Table `duration_limits`**: {id, competitionId, nominationId, level, round, seconds} — `level` замінив `categoryId`: ліміт задається за лігою (Debut 90 / Rising 120 / Pro 180), як в інтерфейсі.

`resolveLimit(performance)`: точний `nominationId` + `round` → він; інакше `level` заявки + `round`; інакше 180 і попередження в лог.

**Стан коду (2026-09-01):** `competition_rules`, `overlimit_tariffs` і `duration_limits` уже змігровані (`20260823090300`…`20260823090500`), модуль `backend/src/competition-rules/` існує. Але `duration_limits` шипнувся з `categoryId`, а не з `level` — разом із CHECK-обмеженням і двома частковими унікальними індексами на нього. Заміна на `level` — **окрема міграція**, не правка наявної.

**Правила:** рядок правил і базові ліміти лігам створюються автоматично при створенні конкурсу; `PATCH /competitions/:id/rules` — часткове оновлення; зміна `pauseSeconds` або лімітів не перераховує вже сформовані відділення — це явна дія в BE-18.

**Готово, коли:**
- [ ] Новий конкурс уже має `pauseSeconds = 20` і ліміти лігам без дій організатора.
- [ ] Ліміт номінації перемагає ліміт ліги.
- [ ] Конкурс без лімітів дає 180 с, не помилку.

### BE-14 (нове): Competition creation wizard

Майстер — шість кроків: загальне й банер → контакти → реквізити → номінації → майданчики → розподіл. Кроку суддів немає.

**Нові поля `competitions`:** {dateFrom, dateTo, bannerPath, contactPhone, contactEmail, registrationFrom, registrationTo, payRecipient, payAccount, payBank, payEdrpou, payPurpose}

**Endpoints:**
- `POST /competitions { name, dateFrom, dateTo?, location, organizer, contactPhone, contactEmail, registrationFrom, registrationTo, description? }` → `201` зі статусом `draft`
- `PATCH /competitions/:id` — автозбереження будь-якого кроку
- `PUT /competitions/:id/payment` — усі п'ять полів опційні
- `POST /competitions/:id/banner` — multipart, jpg/png ≤5 МБ → `{ bannerPath }`
- `PUT /competitions/:id/venues [{ id?, name, note? }]`

**Правила:**
- `dateTo` null → одноденний конкурс; `dateTo >= dateFrom`, інакше `400`.
- Реквізити **ніколи** не блокують перехід між кроками й публікацію. Порожній блок реквізитів не віддається в публічній відповіді взагалі — інтерфейс його ховає.
- `POST /competitions/:id/publish` вимагає `name`, `dateFrom`, `location`, `organizer`, `contactPhone`, `contactEmail` і хоча б одну номінацію → інакше `422 { fields }` з читабельними назвами полів для модального вікна.

**Готово, коли:**
- [ ] Конкурс публікується з повністю порожніми реквізитами.
- [ ] `dateTo < dateFrom` → `400`.
- [ ] Публікація без номінацій → `422` зі згадкою кроку «Номінації».
- [ ] Дводенний конкурс отримує два `competition_days` автоматично (BE-26).

---

## Фаза 6 — Треки

### BE-15 (було BE-10): Accept multi-format tracks and measure duration

Без змін по суті. `tracks` {id, performanceId (unique), originalFileName, storedPath, mimeType, durationSeconds, sizeBytes, uploadedByUserId}; формати не обмежені mp3 (mpeg, wav, x-wav, mp4, aac, ogg, flac, x-m4a), інше → `415` з переліком; ≤50 МБ, інакше `413`; тривалість вимірює сервер (`music-metadata`), округлення вгору; метадані не читаються → `422`; повторне завантаження замінює файл і перераховує перелімітне нарахування; для `improv: true` → `400`.

**Змінено:** дедлайн береться з `competition_rules.trackUploadUntil` (окремий від дедлайну реєстрації); після нього завантаження, заміна й видалення → `403 MUSIC_LOCKED`. Хто вантажить — `assertRegistrationOwner` із BE-10.

**Готово, коли:**
- [ ] WAV приймається нарівні з MP3; PDF → `415`.
- [ ] Трек 72.3 с зберігається як 73.
- [ ] Після `trackUploadUntil` заміна → `403`, читання лишається доступним.
- [ ] Учасник не заливає трек на заявку тренера; організатор — на будь-яку.

### BE-16 (було BE-11): Deterministic performance duration

Чиста функція, без змін:

```
1. improv                        → isGroupImprov ? improvGroupSeconds : improvIndividualSeconds
2. trackDurationSeconds === null → limitSeconds
3. trackDuration <= limit        → trackDurationSeconds
4. surchargesEnabled             → overlimitPaid ? trackDuration : limitSeconds
5. інакше                        → timeSource === 'track' ? trackDuration : limitSeconds
```

**Готово, коли:** кожна з п'яти гілок дає задокументоване значення; `trackDuration === limit` не переліміт; функція без доступу до БД.

---

## Фаза 7 — Програма

### BE-17 (було BE-12): Days, sections and section items

Без змін. `competition_days` {id, competitionId, date, label} unique `(competitionId, date)`; `sections` {id, competitionId, dayId, venueId, name, startTime, sortOrder}; `section_items` {id, sectionId, performanceId, type ENUM(performance,award), nominationGroupKey, sortOrder}; частковий unique index на `performanceId WHERE NOT NULL`; `award` завжди останній — перевірка в сервісі.

### BE-18 (було BE-13): Build sections and calculate schedule

Без змін. `calculateSchedule(startTimeSeconds, items, pauseSeconds)`; пауза після кожного виступу, а для імпровізаційної групи — один раз після номінації; формування відділення з нерозподілених виходів (`409` зі списком уже розподілених), групування за номінацією, всередині — за наскрізним номером; автоматичний рядок `award` останнім; час не зберігається, обчислюється при читанні.

**Змінено:** `GET /competitions/:id/performances/unassigned?level=&ageCategory=&nominationId=` — фільтри перейменовані під нові поля заявки.

**Готово, коли:**
- [ ] Три виступи по 60 с із паузою 20 с від 09:00 → 09:00, 09:01:20, 09:02:40, нагородження 09:04.
- [ ] Імпровізаційна група з трьох по 30 с отримує паузу один раз.
- [ ] Повторне додавання розподіленого виходу → `409`; нагородження завжди останнє.

### BE-19 (було BE-14): Reorder, move and merge program groups

Без змін. `PATCH /sections/:id/order` із перевіркою повного збігу складу (`400`), `award` мовчки в кінець; `POST /performances/:id/move`; `POST /sections/:id/merge-groups` + `merged_group_labels`, об'єднання діє лише в межах конкурсу й не змінює довідник; `DELETE …/merge-groups/:groupKey`.

### BE-20 (було BE-15): Program projections

Три проєкції замість двох.

1. **Публічна** `GET /competitions/:id/program` — без авторизації, лише службові рядки з часом: початок відділення, нагородження, перерва, назва блоку номінацій і його час початку. Прізвищ, номерів і студій тут немає — це афіша для глядача, а не робочий документ.
2. **Своя** `GET /competitions/:id/program/mine` — для `participant` і `coach`: службові рядки плюс лише власні виходи (`isMine` — серед складу Особа цього акаунта; `isMyStudent` — особа з ростера цього тренера) з часом, номером і номінацією.
3. **Розширена** `GET /competitions/:id/program/extended` — організатор і адмін конкурсу: усі позиції з `number`, ПІБ, студією, тренером, `trackDurationSeconds`, `limitSeconds`, `overlimitSeconds`, `overlimitPaid`, `effectiveDurationSeconds`, `hasTrack`. За нею друкують програму для звукорежисера.

**Готово, коли:**
- [ ] Публічна відповідь не містить жодного прізвища.
- [ ] Учасник у `/mine` бачить рівно свої виходи; тренер — виходи своїх учнів.
- [ ] Розширена проєкція для тренера → `403`.
- [ ] Виступ із перелімітом 15 с і оплатою віддає `overlimitSeconds: 15`, `overlimitPaid: true`.

### BE-21 (нове): ZIP music export in schedule order

**Table `export_jobs`** should contain: {id, competitionId, type, status, progress, filePath, payload, missing, createdAt}

**Endpoints:** `POST /competitions/:id/music/export { dayId?, venueId?, sectionId? }` → `202 { jobId }`; `GET /export-jobs/:jobId` → `{ status: 'queued|running|done|failed', progress: 0..100, fileUrl?, missing: [{ number, personName, nomination }] }`.

**Правила:**
- Порядок файлів — **за таймінгами**: `section.sortOrder` → `section_items.sortOrder`. Не за номером і не за номінацією.
- Імена всередині: `{number}_{Ім'я}_{Прізвище}_{Ліга}_{Стиль}.{ext}`; транслітерація не робиться, службові символи файлової системи замінюються на `_`; колізія імен → суфікс `_2`.
- Архів стрімиться у файл на диску пачками, не збирається в пам'яті: 300 треків не мають з'їсти інстанс.
- Виходи без треку не ламають збірку — потрапляють у `missing`, `status` лишається `done`.
- `progress` оновлюється не рідше, ніж кожні 10 файлів — з нього фронт малює прогрес-бар.
- Готовий архів живе 24 год, далі прибирається cron-джобою; повторний запит на той самий скоуп із живим архівом віддає наявний `fileUrl` без перезбірки.

**Готово, коли:**
- [ ] Порядок файлів у архіві збігається з порядком у розширеній програмі.
- [ ] Відділення на 300 треків збирається без падіння пам'яті, `progress` доходить до 100.
- [ ] Дві заявки без музики попадають у `missing`, архів приходить `done`.
- [ ] Повторний запит протягом 24 год не запускає збірку вдруге.

---

## Фаза 8 — Спецкатегорії

### BE-22 (було BE-16): Special categories with programs and exit modes

**Поля `nominations`:** {programIds, exitMode ENUM(single, per_program), isSpecial}

Генерація виходів, `buildNominationLabel` і гілка тривалості — без змін.

**Змінено:** ціну спецкатегорії ставить організатор при створенні конкурсу — `POST /competitions/:id/nominations/specials { name, price, programIds?, exitMode? }`. У шаблоні спецкатегорія — лише назва, без ціни; при генерації вона підтягується як заготовка з `price: null`, і публікація конкурсу з null-ціною спецкатегорії → `422 'Вкажіть ціну для спеціальної номінації «…»'`.

**Готово, коли:**
- [ ] `per_program` із трьома програмами створює 3 виходи з різними `programName`.
- [ ] Назва в `single` не містить програми, у `per_program` — рівно одну.
- [ ] Публікація конкурсу зі спецкатегорією без ціни → `422` з її назвою.

---

## Фаза 9 — Оплати

### BE-23 (було BE-21): Charges, manual payment status and coach payouts

**Table `charges`** should contain: {id, competitionId, registrationId, performanceId, type ENUM(participation, overlimit), amount, status ENUM(pending, paid, waived), paidAt, markedByUserId}

`overlimitPrice(overlimitSeconds, tariffs)` — сходинками, без пропорції, зі стелею найбільшого тарифу.

**Правила без змін:** нарахування за участь при поданні (`amount = nomination.price ?? 0`); перелімітне лише при `surchargesEnabled`; перезавантаження треку перераховує (`pending` видаляється, оплачене → `waived`); `PATCH /charges/:id { status }` вручну організатором із записом `markedByUserId` і `paidAt`; вимкнення доплат не переписує минуле; дублікати оплачуються обидва.

**Змінено:** оплата лише переказом за реквізитами — жодного платіжного шлюзу, жодного вебхука. Статус ставить організатор руками, і це не тимчасове рішення, а рішення продукту.

`GET /competitions/:id/charges` — зведений список: учасник, номер, номінація, ліга, обидва види нарахувань, статуси, `totalDue` і `totalPaid` по конкурсу. `GET /me/charges` — за заявками, де `submittedByUserId` — поточний користувач. `GET /competitions/:id/coach-payouts` — сума оплачених `participation` × `coachPercent / 100`, лише заявки з непорожнім `coachId`; заявка, яку учасник подав за себе, частки не приносить навіть якщо він у ростері; перелімітні нарахування у частку не входять.

**Дроп `entries`** — окремою міграцією останнім кроком фази, після `grep -r "entries/entry.model" backend/src` порожньо.

**Готово, коли:**
- [ ] 15 с і 30 с → 150; 45 с → 200; 90 с → 200 (стеля); 0 с → 0.
- [ ] Заміна треку на коротший прибирає `pending`, оплачене переводить у `waived`.
- [ ] Заявка, подана учасником за себе, не потрапляє у виплати тренера.
- [ ] Таблиці `entries` і теки `backend/src/entries/` більше не існує.

---

## Фаза 10 — Публічна частина й кабінети

### BE-24 (нове): Public catalogue with search, filters and month grouping

**Endpoint** `GET /public/competitions?q=&year=&month=&status=open|upcoming|past&page=` → `{ items: [{ id, name, dateFrom, dateTo, location, organizer, bannerUrl, status, registrationFrom, registrationTo }], total, years: number[] }`

**Правила:**
- `q` шукає по назві, місту й організатору, без регістру, від 2 символів; коротший запит — просто ігнорується, не помилка.
- `status`: `open` — сьогодні в межах реєстрації і конкурс не завершений; `past` — `dateTo` (або `dateFrom`) < сьогодні; `upcoming` — решта.
- Сортування — за `dateFrom` за зростанням: клієнт групує по місяцях і роках, тому порядок мусить бути стабільним і без розривів.
- `years` віддається разом зі списком — з нього будується фільтр за роком, щоб фронт не збирав його з поточної сторінки.
- Лише `published` і далі по життєвому циклу; без авторизації; кеш 60 с.
- `GET /public/competitions/:id` → конкурс, номінації з цінами, майданчики; блок реквізитів **відсутній** у відповіді, якщо всі поля порожні.

**Готово, коли:**
- [ ] Пошук «Київ» знаходить конкурси за містом і за назвою.
- [ ] `status=open` не показує конкурс, у якого реєстрація закрилась учора.
- [ ] `years` містить усі роки з БД, а не лише з поточної сторінки.
- [ ] Конкурс без реквізитів не має ключа `payInfo` у відповіді.

### BE-25 (нове): Role cabinets

**Endpoints:**
- `GET /coach/summary` → `{ persons, registrations, totalDue, totalPaid, upcomingCompetitions }` — цифри для кабінету тренера.
- `GET /participant/registrations` → заявки Особи цього акаунта з конкурсом, номінацією, лігою, статусом, ціною, `hasTrack`, `submittedByName`.
- `GET /admin/dashboard` — лише `superadmin` і `organizer`: конкурси, заявки, сума нарахувань, оплачено, кількість користувачів за ролями. Тренер і учасник → `403`: дашборду в їхніх кабінетах немає.

**Правила:** усі три ендпоінти читають ті самі правила видимості, що BE-10, — тренер бачить подані ним, учасник бачить усі, де є його Особа.

**Готово, коли:**
- [ ] `GET /admin/dashboard` для `coach` → `403`.
- [ ] `totalDue` тренера збігається зі сумою по `GET /me/charges`.
- [ ] Учасник бачить заявку, яку подав тренер, із `canEdit: false`.

---

## Фаза 11 — Життєвий цикл і огляд

### BE-26 (було BE-23): Competition lifecycle and days

`competitions.status` `ENUM('draft','published','registration_open','registration_closed','scheduled','running','finished')`, default `draft`; переходи лише вперед, плюс дозволений `registration_closed → registration_open`; будь-що → `draft` заборонено.

**Змінено:** перехід у `published` вимагає ще й хоча б однієї номінації (узгоджено з BE-14), а реквізити — ні. Дні конкурсу створюються автоматично на кожну дату `dateFrom..dateTo` при створенні; `POST|GET /competitions/:id/days`, `DELETE /days/:id` (`409`, якщо є відділення).

**Готово, коли:**
- [ ] `draft → running` заборонено; `registration_closed → registration_open` дозволено.
- [ ] Публікація без `location` або без номінацій → `422` з переліком полів.
- [ ] Перехід у `scheduled` при нерозподілених виходах → `409` з їх кількістю.
- [ ] Дводенний конкурс отримує 2 дні автоматично.

### BE-27 (було BE-24): Superadmin overview

Без змін. `RolesGuard` за `@Roles('superadmin')`; `GET /admin/competitions` (усі конкурси всіх організаторів із лічильниками, пагінація 25, сортування за `dateFrom` спадно); `GET /admin/coaches?q=` (прізвище, місто, студія, телефон, кількість конкурсів і учасників). Модуль тільки читає.

---

## Відкладено (суддівство й результати)

Виводяться з активного плану — у інтерфейсі суддів приховано, функціонал робиться окремою хвилею. Тексти задач лишаються без змін, беруться в роботу після BE-27:

- **BE-S1** (старий BE-17) — бригади: `judging_panels`, `panel_memberships`, `panel_assignments`. Ендпоінта «призначити номінацію судді» не існує.
- **BE-S2** (BE-18) — аркуші, кворум, ізоляція стажерів.
- **BE-S3** (BE-19) — заміна судді без дотику до призначень.
- **BE-S4** (BE-20) — зведення результатів, бали первинні, місця як тайбрейк.
- **BE-S5** (BE-22) — півфінал і відбір у фінал.

Одне обмеження, яке треба тримати вже зараз: `quorum` і `semifinalThreshold` лишаються в `competition_rules` (BE-13), щоб потім не міняти таблицю правил.

---

## Фінальна перевірка

- [ ] `npm run lint` і `npx tsc --noEmit` — без помилок.
- [ ] `npm run migrate:undo:all && npm run migrate` — повний цикл міграцій робочий в обидва боки.
- [ ] `grep -r "entries/entry.model" backend/src` — порожньо.
- [ ] Кожен інваріант із §9 бачення має або обмеження БД, або явну перевірку в сервісі.
