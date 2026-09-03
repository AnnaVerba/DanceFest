# SMS OTP First Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First login (account with no password) goes phone → SMS 4-digit code → set password → session; every later login is phone/email + password.

**Architecture:** A new `sms/` module with an `SmsProvider` interface and three env-selected implementations (`dev`, `twilio`, `turbosms`). A new `otp_codes` table + `OtpService` (issue/verify with TTL, attempt and rate limits). `AuthService.login` branches: has-password → verify → session; no-password → issue OTP → `{ otpRequired, phone }`. New `POST /auth/otp/verify` and `/auth/otp/resend`. The old `/auth/claim/*` flow and the "Перший вхід…" UI are deleted.

**Tech Stack:** NestJS 11, Sequelize (`sequelize-typescript`), `sequelize-cli` migrations, Postgres, `class-validator`, bcrypt, `twilio` npm client, global `fetch` (Node 22), React + Vite + React Router, CSS modules.

**Spec:** `docs/superpowers/specs/2026-09-03-sms-otp-first-login-design.md`

## Global Constraints

From `CLAUDE.md`:

- Classes, types, and constants each in their **own file**.
- **No magic numbers or strings** — named constants.
- **Do not pass functions as parameters** — inject via class/interface (NestJS DI is fine).
- **Do not write unit tests.** An e2e spec is included only because it is called out in the spec's Testing section and the Developer has asked for e2e verification each round; no other tests.
- **Do not commit.** Each task ends staged and verified; the `git commit` line is written out but the Developer runs it.
- SOLID / clean code, reuse existing patterns (`MailService` is the provider precedent).
- Migrations sort after `20260903120000-add-lineup-to-entries.ts`.
- Backend verify: `cd backend && npx tsc --noEmit && npm run lint`.
- Frontend verify: `cd frontend && npx tsc -b --noEmit && npm run build`.
- Ukrainian user-facing copy.
- Dev OTP code is the string `1111`; `dev` provider sends nothing.

---

## File Structure

### Backend — created

| File | Responsibility |
|---|---|
| `backend/src/sms/sms-provider.interface.ts` | `SmsProvider` interface |
| `backend/src/sms/sms.constants.ts` | provider names, env keys, `DEV_OTP_CODE`, messages |
| `backend/src/sms/dev-sms.provider.ts` | `DevSmsProvider` — logs, no-op |
| `backend/src/sms/twilio-sms.provider.ts` | `TwilioSmsProvider` |
| `backend/src/sms/turbosms-sms.provider.ts` | `TurboSmsProvider` |
| `backend/src/sms/sms.service.ts` | picks a provider from `SMS_PROVIDER`; `send()`, `isDev()` |
| `backend/src/sms/sms.module.ts` | `@Global` module exporting `SmsService` |
| `backend/src/auth/otp-code.model.ts` | `otp_codes` model |
| `backend/src/auth/otp.constants.ts` | OTP numbers + messages |
| `backend/src/auth/otp.service.ts` | `start()`, `verify()` |
| `backend/src/auth/mask-phone.ts` | `maskPhone()`, `isRealPhone()` |
| `backend/src/auth/otp-required.interface.ts` | `OtpRequired` |
| `backend/src/auth/dto/otp-verify.dto.ts` | `OtpVerifyDto` |
| `backend/src/auth/dto/otp-resend.dto.ts` | `OtpResendDto` |
| `backend/migrations/20260903130000-create-otp-codes.ts` | table + `phone` index |

### Backend — modified

| File | Change |
|---|---|
| `backend/package.json` | add `twilio` dependency |
| `backend/src/auth/auth.constants.ts` | drop `CLAIM_TOKEN_*`, `INVALID_CLAIM_TOKEN_MESSAGE`, `PARTICIPANT_TO_CLAIM_NOT_FOUND_MESSAGE`; add `PASSWORD_TOO_SHORT_MESSAGE` |
| `backend/src/auth/jwt-payload.interface.ts` | remove `ClaimTokenPayload` |
| `backend/src/auth/auth.service.ts` | rewrite `login`; add `verifyOtp`, `resendOtp`; delete `startClaim`, `completeClaim` |
| `backend/src/auth/auth.controller.ts` | `login` `@HttpCode(200)`; add `otp/verify`, `otp/resend`; delete `claim/start`, `claim/complete` |
| `backend/src/auth/auth.module.ts` | register `OtpCode` + `OtpService` |
| `backend/src/app.module.ts` | import `SmsModule` |
| `backend/.env.example` | SMS vars |

### Backend — deleted

- `backend/src/auth/dto/claim-start.dto.ts`
- `backend/src/auth/dto/claim-complete.dto.ts`

### Frontend — modified

| File | Change |
|---|---|
| `frontend/src/lib/auth.ts` | `OtpRequired`; `login` returns `Session \| OtpRequired`; add `verifyOtp`, `resendOtp`; delete `startPasswordClaim`, `completePasswordClaim`, `ClaimStart` |
| `frontend/src/lib/auth.constants.ts` | add `OTP_VERIFY_FAILED_MESSAGE`, `OTP_RESEND_FAILED_MESSAGE` |
| `frontend/src/pages/LoginPage.tsx` | remove claim UI; add `stage` machine + OTP screen + resend countdown |
| `frontend/src/pages/LoginPage.module.css` | (only if new classes are needed) |

### e2e — created

- `e2e/tests/auth/otp-first-login.spec.ts`

---

## Task 1: SMS module

**Files:**
- Create: all `backend/src/sms/*`
- Modify: `backend/package.json`, `backend/src/app.module.ts`

**Interfaces:**
- Produces:
  - `interface SmsProvider { send(to: string, message: string): Promise<void> }`
  - `SmsService.send(to: string, message: string): Promise<void>`
  - `SmsService.isDev(): boolean`
  - constants: `SMS_PROVIDER_ENV`, `SMS_PROVIDER_DEV = 'dev'`, `SMS_PROVIDER_TWILIO = 'twilio'`, `SMS_PROVIDER_TURBOSMS = 'turbosms'`, `DEV_OTP_CODE = '1111'`

- [ ] **Step 1: Install twilio**

Run: `cd backend && npm install twilio`
Expected: `package.json` gains `"twilio": "^5.x"` (its own types ship in the package).

- [ ] **Step 2: `sms-provider.interface.ts`**

```ts
export interface SmsProvider {
  // Sends one SMS. Throws on delivery failure.
  send(to: string, message: string): Promise<void>;
}
```

- [ ] **Step 3: `sms.constants.ts`**

```ts
export const SMS_PROVIDER_ENV = 'SMS_PROVIDER';
export const SMS_PROVIDER_DEV = 'dev';
export const SMS_PROVIDER_TWILIO = 'twilio';
export const SMS_PROVIDER_TURBOSMS = 'turbosms';

export const TWILIO_ACCOUNT_SID_ENV = 'TWILIO_ACCOUNT_SID';
export const TWILIO_AUTH_TOKEN_ENV = 'TWILIO_AUTH_TOKEN';
export const TWILIO_FROM_ENV = 'TWILIO_FROM';
export const TURBOSMS_TOKEN_ENV = 'TURBOSMS_TOKEN';
export const TURBOSMS_SENDER_ENV = 'TURBOSMS_SENDER';

// The code every dev / test login expects.
export const DEV_OTP_CODE = '1111';

export const TURBOSMS_SEND_URL = 'https://api.turbosms.ua/message/send.json';

export const SMS_NOT_CONFIGURED_MESSAGE =
  'SMS-провайдер не налаштований — код не надіслано, лише залоговано.';
```

- [ ] **Step 4: `dev-sms.provider.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './sms-provider.interface';

@Injectable()
export class DevSmsProvider implements SmsProvider {
  private readonly logger = new Logger(DevSmsProvider.name);

  send(to: string, message: string): Promise<void> {
    this.logger.log(`[dev SMS] → ${to}: ${message}`);
    return Promise.resolve();
  }
}
```

- [ ] **Step 5: `twilio-sms.provider.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type { Twilio } from 'twilio';
import { SmsProvider } from './sms-provider.interface';
import {
  SMS_NOT_CONFIGURED_MESSAGE,
  TWILIO_ACCOUNT_SID_ENV,
  TWILIO_AUTH_TOKEN_ENV,
  TWILIO_FROM_ENV,
} from './sms.constants';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private client: Twilio | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Twilio | null {
    if (this.client) return this.client;
    const sid = this.config.get<string>(TWILIO_ACCOUNT_SID_ENV);
    const token = this.config.get<string>(TWILIO_AUTH_TOKEN_ENV);
    if (!sid || !token) {
      this.logger.warn(SMS_NOT_CONFIGURED_MESSAGE);
      return null;
    }
    this.client = twilio(sid, token);
    return this.client;
  }

  async send(to: string, message: string): Promise<void> {
    const client = this.getClient();
    const from = this.config.get<string>(TWILIO_FROM_ENV);
    if (!client || !from) {
      this.logger.warn(`${SMS_NOT_CONFIGURED_MESSAGE} → ${to}: ${message}`);
      return;
    }
    await client.messages.create({ to, from, body: message });
  }
}
```

- [ ] **Step 6: `turbosms-sms.provider.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './sms-provider.interface';
import {
  SMS_NOT_CONFIGURED_MESSAGE,
  TURBOSMS_SENDER_ENV,
  TURBOSMS_SEND_URL,
  TURBOSMS_TOKEN_ENV,
} from './sms.constants';

@Injectable()
export class TurboSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TurboSmsProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, message: string): Promise<void> {
    const token = this.config.get<string>(TURBOSMS_TOKEN_ENV);
    const sender = this.config.get<string>(TURBOSMS_SENDER_ENV);
    if (!token || !sender) {
      this.logger.warn(`${SMS_NOT_CONFIGURED_MESSAGE} → ${to}: ${message}`);
      return;
    }
    const response = await fetch(TURBOSMS_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: [to],
        sms: { sender, text: message },
      }),
    });
    if (!response.ok) {
      throw new Error(`TurboSMS ${response.status}: ${await response.text()}`);
    }
  }
}
```

- [ ] **Step 7: `sms.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './sms-provider.interface';
import { DevSmsProvider } from './dev-sms.provider';
import { TwilioSmsProvider } from './twilio-sms.provider';
import { TurboSmsProvider } from './turbosms-sms.provider';
import {
  SMS_PROVIDER_DEV,
  SMS_PROVIDER_ENV,
  SMS_PROVIDER_TURBOSMS,
  SMS_PROVIDER_TWILIO,
} from './sms.constants';

@Injectable()
export class SmsService {
  constructor(
    private readonly config: ConfigService,
    private readonly dev: DevSmsProvider,
    private readonly twilio: TwilioSmsProvider,
    private readonly turbosms: TurboSmsProvider,
  ) {}

  private providerName(): string {
    return this.config.get<string>(SMS_PROVIDER_ENV) ?? SMS_PROVIDER_DEV;
  }

  isDev(): boolean {
    return this.providerName() === SMS_PROVIDER_DEV;
  }

  private provider(): SmsProvider {
    switch (this.providerName()) {
      case SMS_PROVIDER_TWILIO:
        return this.twilio;
      case SMS_PROVIDER_TURBOSMS:
        return this.turbosms;
      default:
        return this.dev;
    }
  }

  send(to: string, message: string): Promise<void> {
    return this.provider().send(to, message);
  }
}
```

- [ ] **Step 8: `sms.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { DevSmsProvider } from './dev-sms.provider';
import { TwilioSmsProvider } from './twilio-sms.provider';
import { TurboSmsProvider } from './turbosms-sms.provider';

@Global()
@Module({
  providers: [SmsService, DevSmsProvider, TwilioSmsProvider, TurboSmsProvider],
  exports: [SmsService],
})
export class SmsModule {}
```

- [ ] **Step 9: Register in `app.module.ts`**

Add `import { SmsModule } from './sms/sms.module';` and put `SmsModule` in the `imports` array next to `MailModule`.

- [ ] **Step 10: Verify**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 11: Commit** (Developer runs)

```bash
git add backend/src/sms backend/src/app.module.ts backend/package.json backend/package-lock.json
git commit -m "feat(sms): env-selected SMS provider (dev / twilio / turbosms)"
```

---

## Task 2: OTP model, migration, service

**Files:**
- Create: `backend/src/auth/otp-code.model.ts`, `backend/src/auth/otp.constants.ts`, `backend/src/auth/otp.service.ts`, `backend/migrations/20260903130000-create-otp-codes.ts`
- Modify: `backend/src/auth/auth.module.ts`

**Interfaces:**
- Consumes: `SmsService` (Task 1); `SALT_ROUNDS` from `./auth.constants`.
- Produces:
  - `OtpService.start(phone: string): Promise<void>`
  - `OtpService.verify(phone: string, code: string): Promise<void>` (throws `UnauthorizedException` on any failure)

- [ ] **Step 1: `otp-code.model.ts`**

```ts
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'otp_codes' })
export class OtpCode extends Model<OtpCode> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare phone: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare codeHash: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare attempts: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare consumedAt: Date | null;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
```

- [ ] **Step 2: `otp.constants.ts`**

```ts
export const OTP_CODE_LENGTH = 4;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const ONE_HOUR_MS = 60 * 60 * 1000;

export const OTP_RESEND_TOO_SOON_MESSAGE =
  'Зачекайте трохи перед повторним надсиланням коду.';
export const OTP_HOURLY_LIMIT_MESSAGE =
  'Забагато спроб. Спробуйте пізніше.';
export const OTP_INVALID_OR_EXPIRED_MESSAGE =
  'Невірний або прострочений код.';
export const OTP_MESSAGE_TEMPLATE = 'Код для входу: %code%. Дійсний 5 хв.';
```

- [ ] **Step 3: `otp.service.ts`**

```ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { SmsService } from '../sms/sms.service';
import { DEV_OTP_CODE } from '../sms/sms.constants';
import { SALT_ROUNDS } from './auth.constants';
import { OtpCode } from './otp-code.model';
import {
  ONE_HOUR_MS,
  OTP_CODE_LENGTH,
  OTP_HOURLY_LIMIT_MESSAGE,
  OTP_INVALID_OR_EXPIRED_MESSAGE,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_MESSAGE_TEMPLATE,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_TOO_SOON_MESSAGE,
  OTP_TTL_MS,
} from './otp.constants';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpCode) private readonly otpModel: typeof OtpCode,
    private readonly smsService: SmsService,
  ) {}

  async start(phone: string): Promise<void> {
    const now = Date.now();
    const recent = await this.otpModel.findAll({
      where: { phone, createdAt: { [Op.gt]: new Date(now - ONE_HOUR_MS) } },
      order: [['createdAt', 'DESC']],
    });
    if (
      recent[0] &&
      now - recent[0].createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        OTP_RESEND_TOO_SOON_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recent.length >= OTP_MAX_SENDS_PER_HOUR) {
      throw new HttpException(
        OTP_HOURLY_LIMIT_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.otpModel.update(
      { consumedAt: new Date() },
      { where: { phone, consumedAt: null } },
    );

    const code = this.smsService.isDev()
      ? DEV_OTP_CODE
      : randomInt(0, 10 ** OTP_CODE_LENGTH)
          .toString()
          .padStart(OTP_CODE_LENGTH, '0');

    await this.otpModel.create({
      phone,
      codeHash: await bcrypt.hash(code, SALT_ROUNDS),
      expiresAt: new Date(now + OTP_TTL_MS),
    } as CreationAttributes<OtpCode>);

    await this.smsService.send(
      phone,
      OTP_MESSAGE_TEMPLATE.replace('%code%', code),
    );
  }

  async verify(phone: string, code: string): Promise<void> {
    const row = await this.otpModel.findOne({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });
    if (!row) {
      throw new UnauthorizedException(OTP_INVALID_OR_EXPIRED_MESSAGE);
    }
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
}
```

- [ ] **Step 4: Migration `20260903130000-create-otp-codes.ts`**

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('otp_codes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      phone: { type: DataTypes.STRING, allowNull: false },
      codeHash: { type: DataTypes.STRING, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      consumedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('otp_codes', ['phone']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('otp_codes');
  },
};
```

- [ ] **Step 5: Wire into `auth.module.ts`**

- Add `OtpCode` to `SequelizeModule.forFeature([RefreshToken, OtpCode])`.
- Add `OtpService` to `providers`.
- Imports: `import { OtpCode } from './otp-code.model';` and
  `import { OtpService } from './otp.service';`.

- [ ] **Step 6: Migrate + verify**

Run: `cd backend && npm run migrate`
Expected: `== 20260903130000-create-otp-codes: migrated`

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit** (Developer runs)

```bash
git add backend/src/auth/otp-code.model.ts backend/src/auth/otp.constants.ts backend/src/auth/otp.service.ts backend/migrations/20260903130000-create-otp-codes.ts backend/src/auth/auth.module.ts
git commit -m "feat(auth): OTP code store + issue/verify service"
```

---

## Task 3: auth helpers, DTOs, constants

**Files:**
- Create: `backend/src/auth/mask-phone.ts`, `backend/src/auth/otp-required.interface.ts`, `backend/src/auth/dto/otp-verify.dto.ts`, `backend/src/auth/dto/otp-resend.dto.ts`
- Modify: `backend/src/auth/auth.constants.ts`, `backend/src/auth/jwt-payload.interface.ts`
- Delete: `backend/src/auth/dto/claim-start.dto.ts`, `backend/src/auth/dto/claim-complete.dto.ts`

**Interfaces:**
- Produces:
  - `maskPhone(phone: string): string`
  - `isRealPhone(phone: string): boolean`
  - `interface OtpRequired { otpRequired: true; phone: string }`
  - `OtpVerifyDto { login: string; code: string; password: string }`
  - `OtpResendDto { login: string }`
  - `PASSWORD_TOO_SHORT_MESSAGE`

- [ ] **Step 1: `mask-phone.ts`**

```ts
// Seeded admins get a placeholder phone `admin:<uuid>` and log in by
// email; the OTP flow only applies to real phone numbers.
const SEED_PHONE_PREFIX = 'admin:';
const VISIBLE_TAIL = 2;
const VISIBLE_HEAD = 4;

export function isRealPhone(phone: string): boolean {
  return !!phone && !phone.startsWith(SEED_PHONE_PREFIX);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, '');
  if (digits.length <= VISIBLE_HEAD + VISIBLE_TAIL) return digits;
  const head = digits.slice(0, VISIBLE_HEAD);
  const tail = digits.slice(-VISIBLE_TAIL);
  return `${head}${'•'.repeat(digits.length - VISIBLE_HEAD - VISIBLE_TAIL)}${tail}`;
}
```

- [ ] **Step 2: `otp-required.interface.ts`**

```ts
export interface OtpRequired {
  otpRequired: true;
  // The masked phone the code was sent to, e.g. "+380••••••67".
  phone: string;
}
```

- [ ] **Step 3: `dto/otp-verify.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';
import { OTP_CODE_LENGTH } from '../otp.constants';

export class OtpVerifyDto {
  @ApiProperty({ example: '+380671234567' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: '1111' })
  @Matches(new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`))
  code: string;

  @ApiProperty({ example: 'strongPassword123', minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;
}
```

- [ ] **Step 4: `dto/otp-resend.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OtpResendDto {
  @ApiProperty({ example: '+380671234567' })
  @IsString()
  @IsNotEmpty()
  login: string;
}
```

- [ ] **Step 5: `auth.constants.ts`**

- Remove: `CLAIM_TOKEN_TYPE`, `CLAIM_TOKEN_EXPIRES_IN_SECONDS`,
  `INVALID_CLAIM_TOKEN_MESSAGE`, `PARTICIPANT_TO_CLAIM_NOT_FOUND_MESSAGE`.
- Add:

```ts
export const PASSWORD_TOO_SHORT_MESSAGE = `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`;
```

(place it after `MIN_PASSWORD_LENGTH` so the template literal resolves.)

- [ ] **Step 6: `jwt-payload.interface.ts`** — delete the `ClaimTokenPayload` interface.

- [ ] **Step 7: Delete the claim DTOs**

Run: `cd backend && rm src/auth/dto/claim-start.dto.ts src/auth/dto/claim-complete.dto.ts`

(`tsc` will now fail in `auth.service.ts` / `auth.controller.ts` — fixed in Tasks 4–5. That is expected; do not verify tsc at the end of this task, only `npm run lint` on the new files.)

- [ ] **Step 8: Commit** (Developer runs)

```bash
git add backend/src/auth
git commit -m "chore(auth): OTP DTOs + helpers; drop claim-token constants and DTOs"
```

---

## Task 4: `auth.service.ts` rewrite

**Files:**
- Modify: `backend/src/auth/auth.service.ts`

**Interfaces:**
- Consumes: `OtpService.start`, `OtpService.verify` (Task 2); `maskPhone`, `isRealPhone` (Task 3); `OtpRequired` (Task 3); `OtpVerifyDto`, `OtpResendDto` (Task 3); `UsersService.claimAccount`, `findByEmailOrPhone`, `findByIdOrFail` (existing).
- Produces:
  - `AuthService.login(dto: LoginDto): Promise<AuthResult | OtpRequired>`
  - `AuthService.verifyOtp(dto: OtpVerifyDto): Promise<AuthResult>`
  - `AuthService.resendOtp(dto: OtpResendDto): Promise<{ phone: string }>`

- [ ] **Step 1: Imports**

In `auth.service.ts`:
- Remove imports of `ClaimStartDto`, `ClaimCompleteDto`, `ClaimTokenPayload`,
  and the claim constants (`CLAIM_TOKEN_*`, `INVALID_CLAIM_TOKEN_MESSAGE`,
  `PARTICIPANT_TO_CLAIM_NOT_FOUND_MESSAGE`).
- Add:

```ts
import { OtpService } from './otp.service';
import { OtpRequired } from './otp-required.interface';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { OtpResendDto } from './dto/otp-resend.dto';
import { isRealPhone, maskPhone } from './mask-phone';
import { PASSWORD_TOO_SHORT_MESSAGE } from './auth.constants';
import { MIN_PASSWORD_LENGTH } from './auth.constants';
```

(Keep `BadRequestException` in the `@nestjs/common` import — it is already there.)

- [ ] **Step 2: Constructor** — inject `OtpService`:

```ts
constructor(
  private readonly usersService: UsersService,
  private readonly jwtService: JwtService,
  private readonly config: ConfigService,
  private readonly refreshTokenStore: RefreshTokenStoreService,
  private readonly otpService: OtpService,
) {}
```

- [ ] **Step 3: Replace `login`**

```ts
async login(dto: LoginDto): Promise<AuthResult | OtpRequired> {
  const login = dto.login.trim();
  const user = await this.usersService.findByEmailOrPhone(login);
  if (!user) {
    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.passwordHash) {
    await this.assertPassword(user.passwordHash, dto.password);
    return this.issueSession(user);
  }

  // First login: no password yet -> phone + SMS code.
  if (dto.password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(PASSWORD_TOO_SHORT_MESSAGE);
  }
  if (!isRealPhone(user.phone)) {
    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  }
  await this.otpService.start(user.phone);
  return { otpRequired: true, phone: maskPhone(user.phone) };
}
```

- [ ] **Step 4: Replace `startClaim` + `completeClaim` with `verifyOtp` + `resendOtp`**

Delete both `startClaim` and `completeClaim` methods. Add:

```ts
async verifyOtp(dto: OtpVerifyDto): Promise<AuthResult> {
  const user = await this.usersService.findByEmailOrPhone(dto.login.trim());
  if (!user || !isRealPhone(user.phone)) {
    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  }
  await this.otpService.verify(user.phone, dto.code);
  await this.usersService.claimAccount(
    user.id,
    await bcrypt.hash(dto.password, SALT_ROUNDS),
  );
  return this.issueSession(await this.usersService.findByIdOrFail(user.id));
}

async resendOtp(dto: OtpResendDto): Promise<{ phone: string }> {
  const user = await this.usersService.findByEmailOrPhone(dto.login.trim());
  if (!user || user.passwordHash || !isRealPhone(user.phone)) {
    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  }
  await this.otpService.start(user.phone);
  return { phone: maskPhone(user.phone) };
}
```

- [ ] **Step 5: Verify**

Run: `cd backend && npx tsc --noEmit`
Expected: only errors remaining are in `auth.controller.ts` (fixed in Task 5). If `auth.service.ts` still errors, fix before continuing.

- [ ] **Step 6: Commit** (Developer runs)

```bash
git add backend/src/auth/auth.service.ts
git commit -m "feat(auth): login issues an SMS OTP for password-less accounts"
```

---

## Task 5: `auth.controller.ts`

**Files:**
- Modify: `backend/src/auth/auth.controller.ts`

**Interfaces:**
- Consumes: `AuthService.login`, `verifyOtp`, `resendOtp` (Task 4).
- Produces routes: `POST /auth/login` (200, `AuthResult | OtpRequired`),
  `POST /auth/otp/verify` (200, `AuthResult`),
  `POST /auth/otp/resend` (200, `{ phone }`).

- [ ] **Step 1: Imports** — replace the two claim DTO imports with:

```ts
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { OtpResendDto } from './dto/otp-resend.dto';
```

- [ ] **Step 2: `login` returns 200**

```ts
@ApiOperation({ summary: 'Log in; password-less accounts get an SMS code' })
@ApiResponse({ status: 200, description: 'Session, or { otpRequired, phone }.' })
@ApiResponse({ status: 401, description: 'Invalid credentials.' })
@HttpCode(HttpStatus.OK)
@Post('login')
login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

- [ ] **Step 3: Replace the two `claim/*` handlers**

```ts
@ApiOperation({ summary: 'First login step 2: verify the SMS code, set the password' })
@ApiResponse({ status: 200, description: 'Session issued.' })
@ApiResponse({ status: 401, description: 'Code is wrong, expired, or used up.' })
@HttpCode(HttpStatus.OK)
@Post('otp/verify')
verifyOtp(@Body() dto: OtpVerifyDto) {
  return this.authService.verifyOtp(dto);
}

@ApiOperation({ summary: 'Resend the SMS login code' })
@ApiResponse({ status: 200, description: 'Code re-sent; returns the masked phone.' })
@ApiResponse({ status: 429, description: 'Too soon, or hourly limit reached.' })
@HttpCode(HttpStatus.OK)
@Post('otp/resend')
resendOtp(@Body() dto: OtpResendDto) {
  return this.authService.resendOtp(dto);
}
```

Ensure `HttpCode`, `HttpStatus` are in the `@nestjs/common` import (they already are).

- [ ] **Step 4: Verify + migrate-clean boot**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

Run: `cd backend && npm run build`
Expected: `nest build` succeeds.

- [ ] **Step 5: Commit** (Developer runs)

```bash
git add backend/src/auth/auth.controller.ts
git commit -m "feat(auth): /auth/otp/verify + /auth/otp/resend; drop /auth/claim/*"
```

---

## Task 6: `.env.example` + backend smoke

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Append SMS vars**

```
# SMS one-time codes: dev | twilio | turbosms
SMS_PROVIDER=dev
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
TURBOSMS_TOKEN=
TURBOSMS_SENDER=
```

- [ ] **Step 2: Boot smoke (needs Postgres)**

Run: `cd backend && SMS_PROVIDER=dev npm run start` (or the built `node dist/src/main`)
Expected: app starts, no DI errors, routes `POST /auth/otp/verify` and `POST /auth/otp/resend` are mapped in the log; `POST /auth/claim/*` are gone.

Manual (optional, DB up): create a password-less user (e.g. `POST /users/participants` as a coach), then
`POST /auth/login { login: "<that phone>", password: "abcdef" }` → `{ otpRequired: true, phone: "…" }`;
`POST /auth/otp/verify { login, code: "1111", password: "abcdef" }` → a session;
second `POST /auth/login { login, password: "abcdef" }` → a session directly (no OTP).

- [ ] **Step 3: Commit** (Developer runs)

```bash
git add backend/.env.example
git commit -m "docs(env): SMS provider variables"
```

---

## Task 7: `frontend/src/lib/auth.ts`

**Files:**
- Modify: `frontend/src/lib/auth.ts`, `frontend/src/lib/auth.constants.ts`

**Interfaces:**
- Produces:
  - `interface OtpRequired { otpRequired: true; phone: string }`
  - `login(loginId, password): Promise<Session | OtpRequired>`
  - `verifyOtp(loginId, code, password): Promise<Session>`
  - `resendOtp(loginId): Promise<{ phone: string }>`

- [ ] **Step 1: Constants**

Append to `frontend/src/lib/auth.constants.ts`:

```ts
export const OTP_VERIFY_FAILED_MESSAGE = 'Не вдалося підтвердити код.';
export const OTP_RESEND_FAILED_MESSAGE = 'Не вдалося надіслати код ще раз.';
```

- [ ] **Step 2: `auth.ts` — types + `login`**

Add near `Session`:

```ts
export interface OtpRequired {
  otpRequired: true;
  phone: string;
}
```

Replace `login`:

```ts
export async function login(
  loginId: string,
  password: string,
): Promise<Session | OtpRequired> {
  const raw = await postAuth(
    '/auth/login',
    { login: loginId, password },
    LOGIN_FAILED_MESSAGE,
  );
  if ((raw as unknown as OtpRequired).otpRequired) {
    return raw as unknown as OtpRequired;
  }
  return toSession(raw);
}
```

(`postAuth` already throws `AuthError` on non-2xx and returns the parsed
body on success; `RawAuthResponse` and `OtpRequired` are disjoint by the
`otpRequired` key.)

- [ ] **Step 3: `verifyOtp` + `resendOtp`**

```ts
export async function verifyOtp(
  loginId: string,
  code: string,
  password: string,
): Promise<Session> {
  const raw = await postAuth(
    '/auth/otp/verify',
    { login: loginId, code, password },
    OTP_VERIFY_FAILED_MESSAGE,
  );
  return toSession(raw);
}

export async function resendOtp(
  loginId: string,
): Promise<{ phone: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/otp/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginId }),
    });
  } catch {
    throw new AuthError(CANNOT_CONNECT_TO_SERVER_MESSAGE);
  }
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & { phone: string })
    | null;
  if (!response.ok) {
    throw new AuthError(
      extractErrorMessage(payload, OTP_RESEND_FAILED_MESSAGE),
    );
  }
  return payload as { phone: string };
}
```

Add `OTP_VERIFY_FAILED_MESSAGE`, `OTP_RESEND_FAILED_MESSAGE` to the
`auth.constants` import block.

- [ ] **Step 4: Remove `startPasswordClaim`, `completePasswordClaim`, `ClaimStart`**

Delete those three exports. Remove now-unused imports they pulled in
(check `LOGIN_FAILED_MESSAGE` is still used elsewhere — it is, by `login`).

- [ ] **Step 5: Verify**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: errors only in `LoginPage.tsx` (fixed in Task 8).

- [ ] **Step 6: Commit** (Developer runs)

```bash
git add frontend/src/lib/auth.ts frontend/src/lib/auth.constants.ts
git commit -m "feat(fe): auth lib — OTP login union, verifyOtp, resendOtp"
```

---

## Task 8: `LoginPage.tsx`

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify (if needed): `frontend/src/pages/LoginPage.module.css`

**Interfaces:**
- Consumes: `login` (union), `verifyOtp`, `resendOtp` (Task 7).

- [ ] **Step 1: Rewrite the component**

```tsx
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AuthError,
  login,
  resendOtp,
  saveSession,
  verifyOtp,
} from '../lib/auth';
import { MIN_PASSWORD_LENGTH } from '../lib/auth.constants';
import styles from './LoginPage.module.css';

const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [stage, setStage] = useState<'login' | 'otp'>('login');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(loginId, password);
      if ('otpRequired' in result) {
        setMaskedPhone(result.phone);
        setStage('otp');
        setResendIn(RESEND_SECONDS);
        setCode('');
        setOtpError(null);
      } else {
        saveSession(result);
        navigate('/profile', { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Не вдалося увійти. Перевірте дані та пароль.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async () => {
    setOtpError(null);
    setOtpBusy(true);
    try {
      const session = await verifyOtp(loginId, code, password);
      saveSession(session);
      navigate('/profile', { replace: true });
    } catch (err) {
      setOtpError(
        err instanceof AuthError ? err.message : 'Невірний код.',
      );
    } finally {
      setOtpBusy(false);
    }
  };

  const doResend = async () => {
    setOtpError(null);
    try {
      const { phone } = await resendOtp(loginId);
      setMaskedPhone(phone);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setOtpError(
        err instanceof AuthError ? err.message : 'Спробуйте пізніше.',
      );
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* brand block — unchanged from the current file */}

        {stage === 'login' && (
          <>
            <h1 className={styles.title}>Вхід</h1>
            <p className={styles.subtitle}>Увійдіть у свій акаунт</p>
            {error && <p className={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="loginId">Номер телефону або email</label>
                <input
                  type="text"
                  id="loginId"
                  placeholder="+380 67 123 45 67"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="password">Пароль</label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
                <p className={styles.hint}>
                  Перший вхід? Введіть номер і придумайте пароль — ми
                  надішлемо код підтвердження.
                </p>
              </div>
              <button
                type="submit"
                className={styles.submit}
                disabled={submitting}
              >
                {submitting ? 'Вхід...' : 'Увійти'}
              </button>
            </form>
            <p className={styles.footer}>
              Немає акаунта? <Link to="/register">Зареєструватися</Link>
            </p>
          </>
        )}

        {stage === 'otp' && (
          <>
            <h1 className={styles.title}>Підтвердження</h1>
            <p className={styles.subtitle}>
              Ми надіслали код на {maskedPhone}
            </p>
            {otpError && <p className={styles.error}>{otpError}</p>}
            <div className={styles.field}>
              <label htmlFor="otp">Код із SMS</label>
              <input
                type="text"
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                placeholder="1111"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
                }
              />
            </div>
            <button
              type="button"
              className={styles.submit}
              disabled={otpBusy || code.length !== OTP_LENGTH}
              onClick={submitOtp}
            >
              {otpBusy ? '...' : 'Підтвердити'}
            </button>
            <button
              type="button"
              className={styles.inlineAction}
              disabled={resendIn > 0}
              onClick={doResend}
            >
              {resendIn > 0
                ? `Надіслати код ще раз (${resendIn})`
                : 'Надіслати код ще раз'}
            </button>
            <button
              type="button"
              className={styles.inlineAction}
              onClick={() => {
                setStage('login');
                setCode('');
                setOtpError(null);
              }}
            >
              ← Змінити номер
            </button>
          </>
        )}
      </div>
    </main>
  );
}
```

Keep the existing brand `<div className={styles.brand}>…</div>` block from
the current file at the top of the card (it is unchanged). Reuse the
existing `styles.inlineAction`, `styles.hint`, `styles.error`,
`styles.field`, `styles.submit` classes — all already in
`LoginPage.module.css`. No CSS change expected; if the two stacked
`inlineAction` buttons need spacing, add `.inlineAction { display: block; margin-top: 8px; }` only if it is not already block.

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc -b --noEmit && npm run build`
Expected: no errors; `vite build` succeeds.

- [ ] **Step 3: Commit** (Developer runs)

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/LoginPage.module.css
git commit -m "feat(fe): login page — SMS code screen for the first login"
```

---

## Task 9: e2e — first login by OTP

**Files:**
- Create: `e2e/tests/auth/otp-first-login.spec.ts`

**Interfaces:**
- Consumes: the running app on :5173 / :4000 with `SMS_PROVIDER=dev`.

- [ ] **Step 1: Spec**

```ts
import { test, expect, type Page } from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';

// SMS_PROVIDER=dev -> the code is always this.
const DEV_CODE = '1111';
const PASSWORD = 'TestPass123!';

function suffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// Registers a coach, adds a roster dancer (a password-less account), and
// returns that dancer's phone.
async function seedPasswordlessDancer(page: Page): Promise<string> {
  const s = suffix();
  await page.goto('/register');
  await page.getByRole('button', { name: 'Тренер' }).click();
  await page.getByLabel("Ім'я").fill('Коуч');
  await page.getByLabel('Прізвище').fill(`Тест${s}`);
  await page.getByLabel('Телефон').fill(`+38050${s.slice(-7)}`);
  await page.getByLabel('Email').fill(`e2e.otp.${s}@example.com`);
  await page.getByLabel('Дата народження').fill('1990-01-01');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Повторіть пароль').fill(PASSWORD);
  await page.getByPlaceholder('…або впишіть нову назву').fill(`E2E ${s}`);
  await page.getByRole('button', { name: 'Додати' }).click();
  await page.getByRole('button', { name: 'Зареєструватися' }).click();
  await page.waitForURL('**/profile');

  const dancerPhone = `+38063${s.slice(-7)}`;
  await page.goto('/my-participants');
  await page.getByRole('button', { name: '+ Додати' }).click();
  await page.getByPlaceholder('Імʼя').fill('Даня');
  await page.getByPlaceholder('Прізвище').fill(`Учасник${s}`);
  await page.getByPlaceholder('Телефон').fill(dancerPhone);
  await page.locator('input[type="date"]').fill('2012-06-01');
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByText(`Учасник${s} Даня`)).toBeVisible();

  // log the coach out
  await page.evaluate(() => window.localStorage.clear());
  return dancerPhone;
}

test.describe('First login via SMS OTP', () => {
  test('a pre-added account logs in with a code, then with a password', async ({
    page,
  }) => {
    const phone = await seedPasswordlessDancer(page);

    // First login: phone + a chosen password -> code screen.
    await page.goto('/login');
    await page.getByLabel('Номер телефону або email').fill(phone);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();

    await expect(
      page.getByRole('heading', { name: 'Підтвердження' }),
    ).toBeVisible();
    await page.getByLabel('Код із SMS').fill(DEV_CODE);
    await page.getByRole('button', { name: 'Підтвердити' }).click();
    await expect(page).toHaveURL(/\/profile$/);

    // Second login: same phone + password, no code screen.
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Номер телефону або email').fill(phone);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test('a wrong code keeps the user on the confirmation screen', async ({
    page,
  }) => {
    const phone = await seedPasswordlessDancer(page);
    await page.goto('/login');
    await page.getByLabel('Номер телефону або email').fill(phone);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();

    await page.getByLabel('Код із SMS').fill('0000');
    await page.getByRole('button', { name: 'Підтвердити' }).click();

    await expect(page.getByText(/Невірний|прострочений/)).toBeVisible();
    await expect(page).not.toHaveURL(/\/profile$/);
  });
});
```

- [ ] **Step 2: Run**

Run: `cd e2e && npx playwright test tests/auth/otp-first-login.spec.ts --reporter=list`
Expected: 2 passed. (Backend must be running with `SMS_PROVIDER=dev` — the default.)

- [ ] **Step 3: Commit** (Developer runs)

```bash
git add e2e/tests/auth/otp-first-login.spec.ts
git commit -m "test(e2e): first login via SMS OTP (dev code)"
```

---

## Self-Review

**1. Spec coverage**

| Spec item | Task |
|---|---|
| `SmsProvider` interface + dev/twilio/turbosms, `SMS_PROVIDER` | Task 1 |
| `SmsService` lazy provider, no-op fallback, `isDev()` | Task 1 |
| `otp_codes` table + migration | Task 2 |
| `OtpService.start` (cooldown 60s, ≤5/hr, invalidate prior, dev `1111`, hashed, 5-min TTL, send) | Task 2 |
| `OtpService.verify` (latest unconsumed non-expired, ≥5 attempts kills it, `attempts++` on miss, consume on hit) | Task 2 |
| `maskPhone` / `isRealPhone` | Task 3 |
| `OtpRequired` interface | Task 3 |
| `OtpVerifyDto` / `OtpResendDto`; delete claim DTOs | Task 3 |
| Drop `CLAIM_TOKEN_*`, `ClaimTokenPayload`; add `PASSWORD_TOO_SHORT_MESSAGE` | Task 3 |
| `login` branch (has-hash → session; no-hash → check length + real phone → start OTP → `{otpRequired, phone}`) | Task 4 |
| `verifyOtp` (verify → `claimAccount` → session) | Task 4 |
| `resendOtp` (guard → start → masked phone) | Task 4 |
| Remove `startClaim`/`completeClaim` | Task 4 |
| `POST /auth/login` 200 + union; `POST /auth/otp/verify`; `POST /auth/otp/resend`; delete `claim/*` | Task 5 |
| `SmsModule` in `app.module`; `OtpCode` + `OtpService` in `auth.module` | Task 1, Task 2 |
| `.env.example` SMS vars | Task 6 |
| FE `login` union, `verifyOtp`, `resendOtp`; drop claim fns | Task 7 |
| `LoginPage` stage machine + code screen + 60 s resend countdown; remove claim UI | Task 8 |
| e2e against dev code `1111` (first login by code, then by password; wrong code) | Task 9 |

Spec "Open questions": both resolved to the stated default and reflected here — no post-login confirmation toast (Task 8 navigates straight to `/profile`); `resendOtp` returns a generic message and the client runs its own countdown (Task 7/8).

**2. Placeholder scan** — no `TBD`/`TODO`; every code step has real content; the LoginPage brand block is referenced as "unchanged from the current file" rather than repeated (it is ~25 lines of static SVG markup already in the file and not modified — repeating it adds no information).

**3. Type consistency**
- `SmsProvider.send(to, message)` — same signature in the interface, all three providers, and `SmsService.send`.
- `OtpService.start(phone)` / `verify(phone, code)` — defined Task 2, called from `auth.service` Task 4 with those exact args.
- `OtpRequired { otpRequired: true; phone: string }` — identical in `otp-required.interface.ts` (BE) and `lib/auth.ts` (FE); `login` return type `AuthResult | OtpRequired` (BE) / `Session | OtpRequired` (FE) consistent.
- `OtpVerifyDto { login, code, password }` — matches `verifyOtp(dto)` usage and the FE `verifyOtp(loginId, code, password)` body `{ login: loginId, code, password }`.
- `DEV_OTP_CODE = '1111'` (BE `sms.constants`) and the e2e `DEV_CODE = '1111'` and the LoginPage placeholder `"1111"` all agree.
- `OTP_CODE_LENGTH = 4` used by the DTO regex, the service code generation, and the FE `OTP_LENGTH = 4`.
- `claimAccount(userId, passwordHash)` — existing `UsersService` method, reused unchanged by `verifyOtp`.

No gaps found.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-03-sms-otp-first-login.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks.

**2. Inline Execution** — tasks run in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
