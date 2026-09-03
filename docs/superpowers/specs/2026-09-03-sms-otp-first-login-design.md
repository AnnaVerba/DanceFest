# SMS OTP first login — design

Date: 2026-09-03
Branch base: `develop`
Status: awaiting review

## Goal

Replace the "claim your account" flow with a phone + SMS one-time-code
first login:

- a user's **first** login (account has no password yet — a roster
  dancer a coach added, a placeholder coach, anyone pre-created) goes
  phone → SMS code → set a password → session. The user never has to
  know they were pre-added or pick a "first login" mode.
- **every login after that** is phone-or-email + password, no SMS.
- SMS goes through a provider chosen by env: `dev` (no send, code is
  always `1111`), `twilio`, or `turbosms`.

Non-goals: OTP on self-registration, OTP as always-on 2FA, email OTP,
"forgot password".

## Decisions (confirmed with Developer)

1. **First login = OTP; later logins = password only.** The login form
   stays `{ login, password }`; `login` is a phone or an email.
2. **Providers:** an `SmsProvider` interface with three
   implementations — `dev`, `twilio`, `turbosms` — selected by
   `SMS_PROVIDER`.
3. **OTP params:** 4 digits, 5-minute TTL, 5 verify attempts then the
   code is dead, 60-second resend cooldown, at most 5 sends per phone per
   hour. Codes are stored bcrypt-hashed in an `otp_codes` table. In `dev`
   the code is always `1111`.
4. The old `POST /auth/claim/start`, `POST /auth/claim/complete`, the
   `CLAIM_TOKEN_*` machinery, and the "Перший вхід…" button are removed.

## Flow

```
LoginPage: { login, password } ──POST /auth/login
   has passwordHash + password ok  → 200 AuthResult (session)      → /profile
   has passwordHash + password bad → 401
   no passwordHash                 → otpService.start(user.phone)
                                     200 { otpRequired: true, phone: "+380••••••67" }
                                     → LoginPage shows the code screen
LoginPage code screen: { code } ──POST /auth/otp/verify { login, code, password }
   code ok → set passwordHash = bcrypt(password), confirmed = true
             → 200 AuthResult (session)                            → /profile
   code bad / expired / >5 attempts → 401
"Надіслати ще раз" ──POST /auth/otp/resend { login } → 200 { phone } | 429
```

`password` typed on the first-login form is the password being set; the
server enforces `MIN_PASSWORD_LENGTH` before sending the code and again on
verify.

## Backend

### New module `sms/`

| File | Responsibility |
|---|---|
| `sms/sms-provider.interface.ts` | `interface SmsProvider { send(to: string, message: string): Promise<void> }` (throws on failure) |
| `sms/sms.constants.ts` | `SMS_PROVIDER_ENV = 'SMS_PROVIDER'`, values `DEV` / `TWILIO` / `TURBOSMS`, env-key constants, `DEV_OTP_CODE = '1111'`, `SMS_NOT_CONFIGURED_MESSAGE` |
| `sms/dev-sms.provider.ts` | `DevSmsProvider` — logs `to` + `message`, returns; never throws |
| `sms/twilio-sms.provider.ts` | `TwilioSmsProvider` — `twilio` npm client from `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`, `messages.create({ to, from: TWILIO_FROM, body })` |
| `sms/turbosms-sms.provider.ts` | `TurboSmsProvider` — `POST https://api.turbosms.ua/message/send.json` with `Authorization: Bearer TURBOSMS_TOKEN`, body `{ recipients: [to], sms: { sender: TURBOSMS_SENDER, text } }` via global `fetch` |
| `sms/sms.service.ts` | reads `SMS_PROVIDER` (default `dev`), lazily builds the matching provider; if a real provider's keys are missing → log a warning once and fall back to a no-op (mirrors `MailService`). Exposes `send(to, message)` and `isDev(): boolean`. |
| `sms/sms.module.ts` | `@Global()`, `providers: [SmsService]`, `exports: [SmsService]` |

`npm i twilio`. TurboSMS uses `fetch` — no dependency.

### OTP

**Model `auth/otp-code.model.ts`** → table `otp_codes`:

| column | type | notes |
|---|---|---|
| `id` | UUID PK | |
| `phone` | STRING NOT NULL, indexed | the recipient |
| `codeHash` | STRING NOT NULL | bcrypt of the 4-digit code |
| `expiresAt` | DATE NOT NULL | `createdAt + 5 min` |
| `attempts` | INTEGER NOT NULL default 0 | failed verifies |
| `consumedAt` | DATE NULL | set when a verify succeeds |
| `createdAt` / `updatedAt` | DATE | |

Migration `create-otp-codes` — table + index on `phone`.

**`auth/otp.constants.ts`**: `OTP_CODE_LENGTH = 4`, `OTP_TTL_MS = 5 * 60_000`,
`OTP_MAX_ATTEMPTS = 5`, `OTP_RESEND_COOLDOWN_MS = 60_000`,
`OTP_MAX_SENDS_PER_HOUR = 5`, plus message constants
(`OTP_RESEND_TOO_SOON_MESSAGE`, `OTP_HOURLY_LIMIT_MESSAGE`,
`OTP_INVALID_OR_EXPIRED_MESSAGE`, `OTP_MESSAGE_TEMPLATE = 'Код для входу: %s. Дійсний 5 хв.'`).

**`auth/otp.service.ts`**

```ts
async start(phone: string): Promise<void> {
  const now = Date.now();
  const recent = await this.otpModel.findAll({
    where: { phone, createdAt: { [Op.gt]: new Date(now - 3600_000) } },
  });
  if (recent.some(r => now - r.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS))
    throw new HttpException(OTP_RESEND_TOO_SOON_MESSAGE, 429);
  if (recent.length >= OTP_MAX_SENDS_PER_HOUR)
    throw new HttpException(OTP_HOURLY_LIMIT_MESSAGE, 429);

  await this.otpModel.update(
    { consumedAt: new Date() },
    { where: { phone, consumedAt: null } },
  );

  const code = this.smsService.isDev()
    ? DEV_OTP_CODE
    : randomInt(0, 10 ** OTP_CODE_LENGTH).toString().padStart(OTP_CODE_LENGTH, '0');
  await this.otpModel.create({
    phone,
    codeHash: await bcrypt.hash(code, SALT_ROUNDS),
    expiresAt: new Date(now + OTP_TTL_MS),
  } as CreationAttributes<OtpCode>);

  await this.smsService.send(phone, OTP_MESSAGE_TEMPLATE.replace('%s', code));
}

async verify(phone: string, code: string): Promise<void> {
  const row = await this.otpModel.findOne({
    where: { phone, consumedAt: null, expiresAt: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
  });
  if (!row) throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await row.update({ consumedAt: new Date() });
    throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
  }
  if (!(await bcrypt.compare(code, row.codeHash))) {
    await row.update({ attempts: row.attempts + 1 });
    throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
  }
  await row.update({ consumedAt: new Date() });
}
```

`randomInt` from `node:crypto`.

### `auth.service.ts`

`AuthResult` is unchanged. Add:

```ts
export interface OtpRequired {
  otpRequired: true;
  phone: string; // masked, e.g. "+380••••••67"
}
```

- **`login(dto)`** — rewritten:
  ```ts
  const user = await this.usersService.findByEmailOrPhone(dto.login.trim());
  if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  if (user.passwordHash) {
    await this.assertPassword(user.passwordHash, dto.password);
    return this.issueSession(user);
  }
  // first login
  if (dto.password.length < MIN_PASSWORD_LENGTH)
    throw new BadRequestException(PASSWORD_TOO_SHORT_MESSAGE);
  if (!isRealPhone(user.phone))
    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  await this.otpService.start(user.phone);
  return { otpRequired: true, phone: maskPhone(user.phone) };
  ```
  `isRealPhone` = not starting with the `admin:` seed prefix. `maskPhone`
  keeps the leading `+380` (or first 4) and the last 2 digits, `•` for the
  rest — a small pure helper in `auth/mask-phone.ts`.
- **`verifyOtp(dto: OtpVerifyDto): Promise<AuthResult>`**:
  ```ts
  const user = await this.usersService.findByEmailOrPhone(dto.login.trim());
  if (!user || !isRealPhone(user.phone))
    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  if (dto.password.length < MIN_PASSWORD_LENGTH)
    throw new BadRequestException(PASSWORD_TOO_SHORT_MESSAGE);
  await this.otpService.verify(user.phone, dto.code);
  await this.usersService.claimAccount(
    user.id,
    await bcrypt.hash(dto.password, SALT_ROUNDS),
  );
  return this.issueSession(await this.usersService.findByIdOrFail(user.id));
  ```
- **`resendOtp(dto: OtpResendDto): Promise<{ phone: string }>`**:
  ```ts
  const user = await this.usersService.findByEmailOrPhone(dto.login.trim());
  if (!user || user.passwordHash || !isRealPhone(user.phone))
    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  await this.otpService.start(user.phone);
  return { phone: maskPhone(user.phone) };
  ```
- **Remove** `startClaim`, `completeClaim`, their imports, and the
  `CLAIM_TOKEN_*` constants + `ClaimTokenPayload`. `claimAccount` on
  `UsersService` stays (now used by `verifyOtp`).

### `auth.controller.ts`

- `POST /auth/login` — return type `AuthResult | OtpRequired` (both plain
  objects; the frontend branches on `otpRequired`). Still `@Post`, still
  `201`? Use `@HttpCode(200)` on login so a non-session response isn't a
  misleading `201`. (Existing e2e that reads the body still works.)
- New `POST /auth/otp/verify` — `OtpVerifyDto { login, code, password }`
  → `AuthResult`.
- New `POST /auth/otp/resend` — `OtpResendDto { login }` →
  `{ phone: string }`.
- **Remove** `POST /auth/claim/start`, `POST /auth/claim/complete` and
  their DTO imports.

**DTOs**

- `auth/dto/otp-verify.dto.ts` — `login` non-empty string; `code`
  `@Length(OTP_CODE_LENGTH, OTP_CODE_LENGTH)` numeric string; `password`
  `@MinLength(MIN_PASSWORD_LENGTH)`.
- `auth/dto/otp-resend.dto.ts` — `login` non-empty string.
- Delete `auth/dto/claim-start.dto.ts`, `auth/dto/claim-complete.dto.ts`.

### `auth.module.ts` / `app.module.ts`

- `AuthModule` registers `OtpCode` with Sequelize and provides
  `OtpService`.
- `app.module.ts` imports `SmsModule`.

### Migration

`backend/migrations/20260903130000-create-otp-codes.ts` — create
`otp_codes` + index on `phone`; `down` drops the table.

### `.env.example`

```
# SMS one-time codes: dev | twilio | turbosms
SMS_PROVIDER=dev
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
TURBOSMS_TOKEN=
TURBOSMS_SENDER=
```

## Frontend

### `lib/auth.ts`

- `interface OtpRequired { otpRequired: true; phone: string }`
- `login(loginId, password): Promise<Session | OtpRequired>` — after
  `postAuth('/auth/login', …)`, if the payload has `otpRequired` return it
  as-is, otherwise `toSession(raw)`.
- `verifyOtp(loginId, code, password): Promise<Session>` →
  `POST /auth/otp/verify`.
- `resendOtp(loginId): Promise<{ phone: string }>` →
  `POST /auth/otp/resend`.
- **Remove** `startPasswordClaim`, `completePasswordClaim`, `ClaimStart`.
- New message constants in `auth.constants.ts` as needed
  (`OTP_VERIFY_FAILED_MESSAGE`, `OTP_RESEND_FAILED_MESSAGE`).

### `LoginPage.tsx`

- Remove all `claim*` state and the three `claimStep` blocks + the
  "Перший вхід або тренер додав вас…" button.
- State: `stage: 'login' | 'otp'`, `maskedPhone: string`, `code: string`,
  `resendIn: number` (seconds), `otpError`, `otpBusy`.
- `handleSubmit`: `const res = await login(loginId, password);` — if
  `'otpRequired' in res` → `setMaskedPhone(res.phone); setStage('otp');
  startResendCountdown(60)`. Else `saveSession(res); navigate('/profile')`.
- `stage === 'otp'` view:
  - text: `Ми надіслали код на {maskedPhone}. Введіть його та придумайте
    пароль для наступних входів.` (password was already typed on step 1 —
    it is carried in `password` state, no second field needed).
  - 4-digit `code` input (`inputMode="numeric"`, `maxLength={4}`).
  - "Підтвердити" → `verifyOtp(loginId, code, password)` →
    `saveSession` → `navigate('/profile')`.
  - "Надіслати код ще раз" — disabled while `resendIn > 0`, shows the
    countdown; on click `resendOtp(loginId)` then restart the countdown.
  - "← Змінити номер" → `setStage('login')`.
- Countdown: a `useEffect` interval decrementing `resendIn` to 0.

### Removed

`lib/auth.ts` claim functions; `LoginPage` claim UI. No route changes.

## Testing

Only if Developer asks. If so, e2e against `SMS_PROVIDER=dev`
(`code = 1111`):

- a pre-added roster dancer logs in for the first time: phone + new
  password → code screen → `1111` → lands on `/profile`; a second login
  with the same phone + password skips the code screen.
- wrong code → error, stays on the code screen.

## Risks / notes

- `POST /auth/otp/{verify,resend}` and the first-login branch of `/login`
  cost real money once a paid provider is on, and are a code-guessing
  target. Mitigations in the design: 60 s resend cooldown, 5 sends per
  phone per hour, 5 verify attempts then the code dies, bcrypt-hashed
  codes, generic `401`. No per-IP limit yet — noted for later.
- `login`'s response is now `AuthResult | OtpRequired`. Every caller must
  branch: `LoginPage` (done here) and any e2e login helper (the shared
  `login.page.ts` is already stale — updating it is out of scope).
- The seeded admin has a placeholder `admin:<uuid>` phone but also a
  password, so it never reaches the OTP branch. Any hypothetical
  password-less account without a real phone gets a generic `401`.
- New dependency: `twilio`.
- `dev` provider still writes an `otp_codes` row (hashed `1111`) so the
  verify path is identical in every environment — only the send is
  skipped.

## Open questions

1. On a successful first login, do we also want to show a one-time "your
   password is set, use it next time" confirmation, or just drop the user
   on `/profile` silently? (This design: silently.)
2. Should `resendOtp` reveal `429` details (seconds left) to the client,
   or just a generic "спробуйте пізніше"? (This design: generic message,
   client runs its own 60 s countdown.)
