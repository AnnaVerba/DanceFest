# Role Access Ladder + Organizer Approval — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish DanseFest's role model — role chosen at registration, self-service coach, admin-approved organizer, placeholder mentor coaches linked by phone, env-seeded first admin.

**Architecture:** Everything hangs off the single `users` table and the `AccessLevel` ladder already present (uncommitted) on `develop`. One new bounded context, `organizer-requests`, mirrors the existing `competition-applications` module. A boot service seeds the first admin. Frontend gains a shared `SchoolPicker`, an organizer-request flow, a mentor-coach field, and an admin review page.

**Tech Stack:** NestJS 11, Sequelize (`sequelize-typescript`), `sequelize-cli` migrations, Postgres, `class-validator` DTOs, React + Vite + React Router, CSS modules.

**Spec:** `docs/superpowers/specs/2026-09-03-role-access-and-organizer-approval-design.md`

## Global Constraints

Copied verbatim from `CLAUDE.md` — every task's requirements implicitly include this section:

- Classes, types, and constants are each defined in their **own file**.
- **No magic numbers or strings** — declare a named constant.
- **Do not pass functions as parameters** — use an interface or class for injected behavior.
- **Do not write tests** for this code. Testing happens only when Developer explicitly asks.
- **Do not commit.** Each task ends with a staged, verified change; Developer runs the commit. The `git commit` step in each task is written out but must not be executed without Developer's go-ahead.
- Satisfy SOLID and clean-code principles. **Reuse** existing code; do not re-implement what exists.
- Match the surrounding file's style.
- Migrations run in filename order and must sort **after** `20260902140000-access-level-ladder.ts`.
- Backend verification command: `cd backend && npx tsc --noEmit` then `npm run lint`.
- Frontend verification command: `cd frontend && npx tsc --noEmit` then `npm run lint`.
- Ukrainian is the user-facing copy language, matching existing constants.

---

## File Structure

### Backend — created

| File | Responsibility |
|---|---|
| `backend/migrations/20260903100000-add-confirmed-to-users.ts` | Add `users.confirmed`, backfill stubs |
| `backend/migrations/20260903100100-create-organizer-requests.ts` | `organizer_requests` table + partial unique index |
| `backend/src/users/placeholder-coach.data.ts` | `PlaceholderCoachData` interface |
| `backend/src/users/coach-summary.interface.ts` | `CoachSummary` interface (picker rows) |
| `backend/src/users/dto/set-mentor-coach.dto.ts` | `SetMentorCoachDto` |
| `backend/src/users/dto/new-mentor-coach.dto.ts` | `NewMentorCoachDto` |
| `backend/src/organizer-requests/organizer-request.model.ts` | Sequelize model |
| `backend/src/organizer-requests/organizer-requests.constants.ts` | Route path + message constants |
| `backend/src/organizer-requests/dto/create-organizer-request.dto.ts` | `CreateOrganizerRequestDto` |
| `backend/src/organizer-requests/dto/review-organizer-request.dto.ts` | `ReviewOrganizerRequestDto` |
| `backend/src/organizer-requests/organizer-requests.service.ts` | Business rules |
| `backend/src/organizer-requests/organizer-requests.controller.ts` | REST endpoints |
| `backend/src/organizer-requests/organizer-requests.module.ts` | Module wiring |
| `backend/src/app-bootstrap/app-bootstrap.constants.ts` | Env-key + seed constants |
| `backend/src/app-bootstrap/app-bootstrap.service.ts` | `OnModuleInit` first-admin seed |
| `backend/src/app-bootstrap/app-bootstrap.module.ts` | Module wiring |

### Backend — modified

| File | Change |
|---|---|
| `backend/src/users/user.model.ts` | `confirmed` column |
| `backend/src/users/users.constants.ts` | new message constants |
| `backend/src/users/users.service.ts` | `confirmed` in `CreateUserData`; `createPlaceholderCoach`, `linkRegistration`, `claimAccount`, `setMentorCoach`, `listSelectableCoaches`; `selfUpgrade` COACH-only |
| `backend/src/users/users.controller.ts` | `PATCH /users/me/coach`, `GET /users/coaches` |
| `backend/src/users/dto/upgrade-level.dto.ts` | narrow to `COACH` |
| `backend/src/auth/dto/register.dto.ts` | `role`, `schoolId` |
| `backend/src/auth/auth.service.ts` | `register` stub-claim branch; `completeClaim` sets `confirmed` |
| `backend/src/app.module.ts` | register `OrganizerRequestsModule`, `AppBootstrapModule` |
| `backend/.env.example` | document `ADMIN_EMAIL`, `ADMIN_PASSWORD` |

### Frontend — created

| File | Responsibility |
|---|---|
| `frontend/src/components/SchoolPicker.tsx` (+ `.module.css`) | Choose-or-create school, shared by 3 call sites |
| `frontend/src/lib/organizerRequests.ts` | organizer-request API calls |
| `frontend/src/lib/organizerRequests.constants.ts` | error-message constants |
| `frontend/src/components/OrganizerRequestForm.tsx` (+ `.module.css`) | school + note → submit request |
| `frontend/src/components/MentorCoachField.tsx` (+ `.module.css`) | pick-or-name mentor coach |
| `frontend/src/pages/OrganizerRequestsPage.tsx` (+ `.module.css`) | admin review table |

### Frontend — modified

| File | Change |
|---|---|
| `frontend/src/lib/roles.ts` | `SELF_UPGRADABLE_LEVELS` → `[COACH]` |
| `frontend/src/lib/auth.ts` | `RegisterPayload` gains `role`, `schoolId?`; add `getSelectableCoaches`, `setMentorCoach` |
| `frontend/src/lib/users.ts` | `MyProfile` unchanged; add `CoachSummary` import path note |
| `frontend/src/pages/RegisterPage.tsx` | role toggle + `SchoolPicker` |
| `frontend/src/components/LevelUpgrade.tsx` (+ `.module.css`) | drop "Стати організатором"; use `SchoolPicker`; add request entry |
| `frontend/src/pages/ProfilePage.tsx` | render `MentorCoachField`, admin link |
| `frontend/src/App.tsx` | `/organizer-requests` route |

---

## Task 1: `users.confirmed` column + migration

**Files:**
- Create: `backend/migrations/20260903100000-add-confirmed-to-users.ts`
- Modify: `backend/src/users/user.model.ts`
- Modify: `backend/src/users/users.service.ts` (interface only)

**Interfaces:**
- Produces: `User.confirmed: boolean`; `CreateUserData.confirmed: boolean`.

- [ ] **Step 1: Write the migration**

Create `backend/migrations/20260903100000-add-confirmed-to-users.ts`:

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// `confirmed = false` marks a stub row with no real login behind it yet:
// a coach-created roster participant, or a named-but-unregistered mentor
// coach. It flips to true on claim-complete or on registration by phone.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('users');
    if (!table.confirmed) {
      await queryInterface.addColumn('users', 'confirmed', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
    await queryInterface.sequelize.query(
      'UPDATE users SET confirmed = false WHERE "passwordHash" IS NULL',
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('users', 'confirmed');
  },
};
```

- [ ] **Step 2: Add the column to the model**

In `backend/src/users/user.model.ts`, after the `accessLevel` column block:

```ts
  // False for a stub row with no real login yet (roster participant a
  // coach added, or a mentor coach named but not registered).
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare confirmed: boolean;
```

- [ ] **Step 3: Extend `CreateUserData`**

In `backend/src/users/users.service.ts`, add to the `CreateUserData` interface:

```ts
  confirmed: boolean;
```

Then in `AuthService`-facing `create()` callers we will pass it (Task 4). For now update `createRosterParticipant` to set `confirmed: false` in its `create({...})` object:

```ts
      accessLevel: AccessLevel.PARTICIPANT,
      schoolId: null,
      coachId: data.coachId,
      confirmed: false,
```

- [ ] **Step 4: Run the migration and verify**

Run: `cd backend && npm run migrate`
Expected: `== 20260903100000-add-confirmed-to-users: migrated`

Run: `cd backend && npx tsc --noEmit`
Expected: no errors (all `create()` call sites now supply `confirmed`; the register call site is fixed in Task 4 — if tsc flags `auth.service.ts` here, add `confirmed: true` to that object now).

- [ ] **Step 5: Commit** (Developer runs this)

```bash
git add backend/migrations/20260903100000-add-confirmed-to-users.ts backend/src/users/user.model.ts backend/src/users/users.service.ts
git commit -m "feat(users): add confirmed flag for stub accounts"
```

---

## Task 2: users.service — placeholder coach, link, claim, self-upgrade narrowing

**Files:**
- Create: `backend/src/users/placeholder-coach.data.ts`
- Modify: `backend/src/users/users.constants.ts`
- Modify: `backend/src/users/users.service.ts`

**Interfaces:**
- Consumes: `User.confirmed`, `CreateUserData.confirmed` (Task 1); `isHigherLevel`, `AccessLevel` from `../auth/access-level.enum`.
- Produces:
  - `PlaceholderCoachData { firstName: string; lastName: string; phone: string }`
  - `UsersService.createPlaceholderCoach(data: PlaceholderCoachData): Promise<User>`
  - `UsersService.linkRegistration(userId: string, fields: LinkRegistrationFields): Promise<User>`
  - `UsersService.claimAccount(userId: string, passwordHash: string): Promise<void>`
  - `UsersService.setMentorCoach(userId: string, coachId: string): Promise<void>`
  - `UsersService.listSelectableCoaches(): Promise<User[]>`
  - `LinkRegistrationFields` = `Pick<User, 'firstName' | 'lastName' | 'email' | 'passwordHash' | 'birthDate' | 'accessLevel' | 'schoolId' | 'confirmed'>` (partial)

- [ ] **Step 1: Add the data interface file**

Create `backend/src/users/placeholder-coach.data.ts`:

```ts
export interface PlaceholderCoachData {
  firstName: string;
  lastName: string;
  phone: string;
}
```

- [ ] **Step 2: Add message constants**

Append to `backend/src/users/users.constants.ts`:

```ts
export const ONLY_COACH_SELF_UPGRADE_MESSAGE =
  'Самостійно можна отримати лише рівень тренера';
export const MENTOR_COACH_NOT_FOUND_MESSAGE = 'Вказаного тренера не знайдено';
```

- [ ] **Step 3: Implement the new service methods**

In `backend/src/users/users.service.ts`:

Add imports:

```ts
import { PlaceholderCoachData } from './placeholder-coach.data';
import {
  MENTOR_COACH_NOT_FOUND_MESSAGE,
  ONLY_COACH_SELF_UPGRADE_MESSAGE,
} from './users.constants';
```

Add a `LinkRegistrationFields` type near `CreateUserData`:

```ts
export type LinkRegistrationFields = Partial<
  Pick<
    User,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'passwordHash'
    | 'birthDate'
    | 'accessLevel'
    | 'schoolId'
    | 'confirmed'
  >
>;
```

Add methods to the class:

```ts
  // A mentor coach a user named who is not in the system yet. Keyed by
  // phone: if a row with that phone already exists (stub or real), reuse
  // it rather than creating a duplicate.
  async createPlaceholderCoach(data: PlaceholderCoachData): Promise<User> {
    const existing = await this.findByPhone(data.phone.trim());
    if (existing) {
      return existing;
    }
    return this.userModel.create({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone.trim(),
      email: null,
      passwordHash: null,
      birthDate: null,
      accessLevel: AccessLevel.COACH,
      schoolId: null,
      coachId: null,
      confirmed: false,
    } as CreationAttributes<User>);
  }

  // The real person registers with a stub's phone: fold the form data
  // into the existing row, keeping its id so every coachId / participantId
  // pointing at it stays valid.
  async linkRegistration(
    userId: string,
    fields: LinkRegistrationFields,
  ): Promise<User> {
    await this.userModel.update(fields, { where: { id: userId } });
    return this.findByIdOrFail(userId);
  }

  // Claim by phone: set the first password and mark the row confirmed.
  async claimAccount(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.update(
      { passwordHash, confirmed: true },
      { where: { id: userId } },
    );
  }

  async setMentorCoach(userId: string, coachId: string): Promise<void> {
    const coach = await this.findById(coachId);
    if (!coach) {
      throw new NotFoundException(MENTOR_COACH_NOT_FOUND_MESSAGE);
    }
    await this.userModel.update({ coachId }, { where: { id: userId } });
  }

  // Coaches a user may pick as their own mentor: real (confirmed) rows at
  // COACH level or above. Stubs are excluded.
  listSelectableCoaches(): Promise<User[]> {
    return this.userModel.findAll({
      where: {
        confirmed: true,
        accessLevel: {
          [Op.in]: [
            AccessLevel.COACH,
            AccessLevel.ORGANIZER,
            AccessLevel.ADMIN,
          ],
        },
      },
      include: [School],
      order: [['lastName', 'ASC']],
    });
  }
```

Add the `School` import if missing:

```ts
import { School } from '../schools/school.model';
```

- [ ] **Step 4: Narrow `selfUpgrade` to COACH**

Replace the body of `selfUpgrade` guard section:

```ts
  async selfUpgrade(
    userId: string,
    level: AccessLevel,
    schoolId?: string,
  ): Promise<User> {
    if (level !== AccessLevel.COACH) {
      throw new BadRequestException(ONLY_COACH_SELF_UPGRADE_MESSAGE);
    }
    const user = await this.findByIdOrFail(userId);
    if (!isHigherLevel(level, user.accessLevel)) {
      throw new BadRequestException(LEVEL_ONLY_GOES_UP_MESSAGE);
    }
    if (schoolId) {
      await this.schoolsService.findByIdOrFail(schoolId);
    }
    await this.userModel.update(
      { accessLevel: level, ...(schoolId ? { schoolId } : {}) },
      { where: { id: userId } },
    );
    return this.findByIdOrFail(userId);
  }
```

- [ ] **Step 5: Verify**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

Run: `cd backend && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit** (Developer runs this)

```bash
git add backend/src/users/placeholder-coach.data.ts backend/src/users/users.constants.ts backend/src/users/users.service.ts
git commit -m "feat(users): placeholder coach, registration link, claim, coach-only self-upgrade"
```

---

## Task 3: users.controller — mentor-coach endpoints, narrow upgrade DTO

**Files:**
- Create: `backend/src/users/dto/new-mentor-coach.dto.ts`
- Create: `backend/src/users/dto/set-mentor-coach.dto.ts`
- Create: `backend/src/users/coach-summary.interface.ts`
- Modify: `backend/src/users/dto/upgrade-level.dto.ts`
- Modify: `backend/src/users/users.constants.ts`
- Modify: `backend/src/users/users.controller.ts`

**Interfaces:**
- Consumes: `UsersService.setMentorCoach`, `UsersService.createPlaceholderCoach`, `UsersService.listSelectableCoaches` (Task 2).
- Produces:
  - `NewMentorCoachDto { firstName: string; lastName: string; phone: string }`
  - `SetMentorCoachDto { coachId?: string; newCoach?: NewMentorCoachDto }`
  - `CoachSummary { id: string; firstName: string; lastName: string; schoolName: string | null }`
  - `PATCH /users/me/coach` → `{ coachId: string }`
  - `GET /users/coaches` → `CoachSummary[]`

- [ ] **Step 1: `NewMentorCoachDto`**

Create `backend/src/users/dto/new-mentor-coach.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class NewMentorCoachDto {
  @ApiProperty({ example: 'Петро' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Іваненко' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+380501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
```

- [ ] **Step 2: message constant for the one-of rule**

Append to `backend/src/users/users.constants.ts`:

```ts
export const MENTOR_COACH_ONE_OF_MESSAGE =
  'Вкажіть або наявного тренера, або дані нового — але не обидва';
```

- [ ] **Step 3: `SetMentorCoachDto` with an exactly-one-of check**

Create `backend/src/users/dto/set-mentor-coach.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { NewMentorCoachDto } from './new-mentor-coach.dto';
import { MENTOR_COACH_ONE_OF_MESSAGE } from '../users.constants';

export class SetMentorCoachDto {
  @ApiProperty({ required: false, description: 'An existing coach id.' })
  @IsOptional()
  @IsUUID()
  coachId?: string;

  @ApiProperty({ required: false, type: NewMentorCoachDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewMentorCoachDto)
  newCoach?: NewMentorCoachDto;

  // Exactly one of the two must be present.
  @ValidateIf((o: SetMentorCoachDto) => !o.coachId === !o.newCoach)
  @IsUUID(undefined, { message: MENTOR_COACH_ONE_OF_MESSAGE })
  readonly _oneOf?: string;
}
```

Note: the `_oneOf` trick makes validation fail with `MENTOR_COACH_ONE_OF_MESSAGE` when both or neither are supplied (`!a === !b`). `whitelist: true` in the global pipe strips `_oneOf` from the payload.

- [ ] **Step 4: `CoachSummary` interface**

Create `backend/src/users/coach-summary.interface.ts`:

```ts
export interface CoachSummary {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
}
```

- [ ] **Step 5: Narrow `UpgradeLevelDto`**

Replace `backend/src/users/dto/upgrade-level.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { AccessLevel } from '../../auth/access-level.enum';

const SELF_UPGRADABLE = [AccessLevel.COACH];

export class UpgradeLevelDto {
  @ApiProperty({ enum: SELF_UPGRADABLE, example: AccessLevel.COACH })
  @IsIn(SELF_UPGRADABLE)
  level: AccessLevel.COACH;

  @ApiProperty({
    required: false,
    description: 'The school the coach belongs to (required from the UI).',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
```

- [ ] **Step 6: Controller endpoints**

In `backend/src/users/users.controller.ts` add imports:

```ts
import { SetMentorCoachDto } from './dto/set-mentor-coach.dto';
import { CoachSummary } from './coach-summary.interface';
```

Add two handlers to the class:

```ts
  @ApiOperation({ summary: 'Set your own mentor coach (pick or name a new one)' })
  @ApiResponse({ status: 200, description: 'Mentor coach set.' })
  @MinLevel(AccessLevel.COACH)
  @Patch('me/coach')
  async setMyCoach(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetMentorCoachDto,
  ): Promise<{ coachId: string }> {
    const coachId = dto.coachId
      ? dto.coachId
      : (
          await this.usersService.createPlaceholderCoach({
            firstName: dto.newCoach!.firstName,
            lastName: dto.newCoach!.lastName,
            phone: dto.newCoach!.phone,
          })
        ).id;
    await this.usersService.setMentorCoach(user.id, coachId);
    return { coachId };
  }

  @ApiOperation({ summary: 'Coaches you can pick as your own mentor' })
  @ApiResponse({ status: 200, description: 'Coaches returned.' })
  @MinLevel(AccessLevel.COACH)
  @Get('coaches')
  async findSelectableCoaches(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CoachSummary[]> {
    const coaches = await this.usersService.listSelectableCoaches();
    return coaches
      .filter((coach) => coach.id !== user.id)
      .map((coach) => ({
        id: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
        schoolName: coach.school?.name ?? null,
      }));
  }
```

- [ ] **Step 7: Verify**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

Manual smoke (optional, needs a running DB + a COACH token):
`GET /users/coaches` → `200 []`; `PATCH /users/me/coach { "newCoach": {...} }` → `200 { coachId }`.

- [ ] **Step 8: Commit** (Developer runs this)

```bash
git add backend/src/users/dto/new-mentor-coach.dto.ts backend/src/users/dto/set-mentor-coach.dto.ts backend/src/users/coach-summary.interface.ts backend/src/users/dto/upgrade-level.dto.ts backend/src/users/users.constants.ts backend/src/users/users.controller.ts
git commit -m "feat(users): mentor-coach endpoints, coach-only upgrade DTO"
```

---

## Task 4: auth — registration role + stub-claim, confirmed on claim

**Files:**
- Modify: `backend/src/auth/dto/register.dto.ts`
- Modify: `backend/src/auth/auth.service.ts`

**Interfaces:**
- Consumes: `UsersService.linkRegistration`, `UsersService.claimAccount` (Task 2); `isHigherLevel`, `AccessLevel`; `SCHOOL_REQUIRED_FOR_COACH_MESSAGE` from `../users/users.constants`.
- Produces: `RegisterDto.role: AccessLevel.PARTICIPANT | AccessLevel.COACH`, `RegisterDto.schoolId?: string`.

- [ ] **Step 1: Extend `RegisterDto`**

Replace `backend/src/auth/dto/register.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';
import { AccessLevel } from '../access-level.enum';

const REGISTRABLE_ROLES = [AccessLevel.PARTICIPANT, AccessLevel.COACH];

// Everyone registers as PARTICIPANT or COACH. A coach also sends the
// school id (the UI creates the school first when it is new). ORGANIZER is
// reached later through an admin-approved request.
export class RegisterDto {
  @ApiProperty({ example: 'Іван' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Іванов' })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+380501234567' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @ApiProperty({ example: '2010-05-20' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ enum: REGISTRABLE_ROLES, example: AccessLevel.PARTICIPANT })
  @IsIn(REGISTRABLE_ROLES)
  role: AccessLevel.PARTICIPANT | AccessLevel.COACH;

  @ApiProperty({
    required: false,
    description: 'Required when role is COACH.',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
```

- [ ] **Step 2: Rework `AuthService.register`**

In `backend/src/auth/auth.service.ts`:

Add imports:

```ts
import { BadRequestException } from '@nestjs/common';
import { isHigherLevel } from './access-level.enum';
import { SCHOOL_REQUIRED_FOR_COACH_MESSAGE } from '../users/users.constants';
```

Replace `register`:

```ts
  async register(dto: RegisterDto): Promise<AuthResult> {
    if (dto.role === AccessLevel.COACH && !dto.schoolId) {
      throw new BadRequestException(SCHOOL_REQUIRED_FOR_COACH_MESSAGE);
    }

    const phone = dto.phone.trim();
    const [byEmail, byPhone] = await Promise.all([
      this.usersService.findByEmail(dto.email),
      this.usersService.findByPhone(phone),
    ]);
    if (byEmail) {
      throw new UnauthorizedException(EMAIL_OR_PHONE_TAKEN_MESSAGE);
    }
    if (byPhone && byPhone.confirmed) {
      throw new UnauthorizedException(EMAIL_OR_PHONE_TAKEN_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // The real person is claiming a stub someone named for them.
    if (byPhone && !byPhone.confirmed) {
      const accessLevel = isHigherLevel(dto.role, byPhone.accessLevel)
        ? dto.role
        : byPhone.accessLevel;
      const linked = await this.usersService.linkRegistration(byPhone.id, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        birthDate: dto.birthDate,
        accessLevel,
        schoolId:
          dto.role === AccessLevel.COACH ? dto.schoolId : byPhone.schoolId,
        confirmed: true,
      });
      return this.issueSession(linked);
    }

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone,
      email: dto.email,
      passwordHash,
      birthDate: dto.birthDate,
      accessLevel: dto.role,
      schoolId: dto.role === AccessLevel.COACH ? dto.schoolId! : null,
      coachId: null,
      confirmed: true,
    });
    return this.issueSession(user);
  }
```

- [ ] **Step 3: `completeClaim` marks the row confirmed**

In the same file, in `completeClaim`, replace the password-set branch:

```ts
    const user = await this.usersService.findByIdOrFail(payload.sub);
    if (user.passwordHash) {
      await this.assertPassword(user.passwordHash, dto.password);
    } else {
      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      await this.usersService.claimAccount(user.id, passwordHash);
    }
    return this.issueSession(user);
```

(Removes the direct `usersService.setPassword` call for the claim path; leave `setPassword` in place for any other caller.)

- [ ] **Step 4: Verify**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit** (Developer runs this)

```bash
git add backend/src/auth/dto/register.dto.ts backend/src/auth/auth.service.ts
git commit -m "feat(auth): role at registration, stub-claim by phone, confirmed on claim"
```

---

## Task 5: organizer-requests module

**Files:**
- Create: `backend/src/organizer-requests/organizer-request.model.ts`
- Create: `backend/src/organizer-requests/organizer-requests.constants.ts`
- Create: `backend/src/organizer-requests/dto/create-organizer-request.dto.ts`
- Create: `backend/src/organizer-requests/dto/review-organizer-request.dto.ts`
- Create: `backend/src/organizer-requests/organizer-requests.service.ts`
- Create: `backend/src/organizer-requests/organizer-requests.controller.ts`
- Create: `backend/src/organizer-requests/organizer-requests.module.ts`
- Create: `backend/migrations/20260903100100-create-organizer-requests.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `ApplicationStatus` from `../competition-applications/application-status.enum`; `UsersService.setLevel`, `UsersService.updateFields`, `UsersService.findByIdOrFail` (existing); `SchoolsService.findByIdOrFail` (existing); `MinLevelGuard`, `@MinLevel`, `JwtAuthGuard`, `@CurrentUser`, `AuthenticatedUser`, `AccessLevel`.
- Produces:
  - `CreateOrganizerRequestDto { schoolId: string; note?: string }`
  - `ReviewOrganizerRequestDto { status: ApplicationStatus.APPROVED | ApplicationStatus.REJECTED; decisionNote?: string }`
  - `POST /organizer-requests`, `GET /organizer-requests/me`, `GET /organizer-requests`, `PATCH /organizer-requests/:id`, `PATCH /organizer-requests/:id/cancel`

- [ ] **Step 1: Constants**

Create `backend/src/organizer-requests/organizer-requests.constants.ts`:

```ts
export const ORGANIZER_REQUESTS_ROUTE = 'organizer-requests';

export const ALREADY_ORGANIZER_MESSAGE =
  'Ви вже маєте рівень організатора або вищий';
export const REQUEST_ALREADY_PENDING_MESSAGE =
  'У вас уже є заявка на розгляді';
export const REQUEST_NOT_FOUND_MESSAGE = 'Заявку не знайдено';
export const REQUEST_NOT_OWNED_MESSAGE = 'Це не ваша заявка';
export const REQUEST_NOT_PENDING_MESSAGE =
  'Заявку вже розглянуто або скасовано';
```

- [ ] **Step 2: Model**

Create `backend/src/organizer-requests/organizer-request.model.ts`:

```ts
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../users/user.model';
import { School } from '../schools/school.model';
import { ApplicationStatus } from '../competition-applications/application-status.enum';

@Table({ tableName: 'organizer_requests' })
export class OrganizerRequest extends Model<OrganizerRequest> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @BelongsTo(() => User, 'userId')
  declare user: User;

  @ForeignKey(() => School)
  @Column({ type: DataType.UUID, allowNull: false })
  declare schoolId: string;

  @BelongsTo(() => School)
  declare school: School;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare note: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(ApplicationStatus)),
    allowNull: false,
    defaultValue: ApplicationStatus.PENDING,
  })
  declare status: ApplicationStatus;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare reviewedByUserId: string | null;

  @BelongsTo(() => User, 'reviewedByUserId')
  declare reviewedBy: User | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare reviewedAt: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare decisionNote: string | null;
}
```

- [ ] **Step 3: DTOs**

Create `backend/src/organizer-requests/dto/create-organizer-request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrganizerRequestDto {
  @ApiProperty({ description: 'School the applicant will organize under.' })
  @IsUUID()
  schoolId: string;

  @ApiProperty({ required: false, description: 'Motivation, optional.' })
  @IsOptional()
  @IsString()
  note?: string;
}
```

Create `backend/src/organizer-requests/dto/review-organizer-request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../../competition-applications/application-status.enum';

const DECISIONS = [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED];

export class ReviewOrganizerRequestDto {
  @ApiProperty({ enum: DECISIONS })
  @IsIn(DECISIONS)
  status: ApplicationStatus.APPROVED | ApplicationStatus.REJECTED;

  @ApiProperty({ required: false, description: 'Reason shown on reject.' })
  @IsOptional()
  @IsString()
  decisionNote?: string;
}
```

- [ ] **Step 4: Service**

Create `backend/src/organizer-requests/organizer-requests.service.ts`:

```ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { AccessLevel, meetsLevel } from '../auth/access-level.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { ApplicationStatus } from '../competition-applications/application-status.enum';
import { OrganizerRequest } from './organizer-request.model';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';
import { ReviewOrganizerRequestDto } from './dto/review-organizer-request.dto';
import {
  ALREADY_ORGANIZER_MESSAGE,
  REQUEST_ALREADY_PENDING_MESSAGE,
  REQUEST_NOT_FOUND_MESSAGE,
  REQUEST_NOT_OWNED_MESSAGE,
  REQUEST_NOT_PENDING_MESSAGE,
} from './organizer-requests.constants';

@Injectable()
export class OrganizerRequestsService {
  constructor(
    @InjectModel(OrganizerRequest)
    private readonly requestModel: typeof OrganizerRequest,
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
  ) {}

  async create(
    dto: CreateOrganizerRequestDto,
    user: AuthenticatedUser,
  ): Promise<OrganizerRequest> {
    if (meetsLevel(user.accessLevel, AccessLevel.ORGANIZER)) {
      throw new BadRequestException(ALREADY_ORGANIZER_MESSAGE);
    }
    const pending = await this.requestModel.findOne({
      where: { userId: user.id, status: ApplicationStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException(REQUEST_ALREADY_PENDING_MESSAGE);
    }
    await this.schoolsService.findByIdOrFail(dto.schoolId);

    return this.requestModel.create({
      userId: user.id,
      schoolId: dto.schoolId,
      note: dto.note ?? null,
      status: ApplicationStatus.PENDING,
    } as CreationAttributes<OrganizerRequest>);
  }

  findMine(user: AuthenticatedUser): Promise<OrganizerRequest[]> {
    return this.requestModel.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
    });
  }

  findAll(status?: ApplicationStatus): Promise<OrganizerRequest[]> {
    return this.requestModel.findAll({
      where: status ? { status } : undefined,
      order: [['createdAt', 'DESC']],
    });
  }

  async review(
    id: string,
    dto: ReviewOrganizerRequestDto,
    admin: AuthenticatedUser,
  ): Promise<OrganizerRequest> {
    const request = await this.findByIdOrFail(id);
    if (request.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(REQUEST_NOT_PENDING_MESSAGE);
    }

    request.status = dto.status;
    request.decisionNote = dto.decisionNote ?? null;
    request.reviewedByUserId = admin.id;
    request.reviewedAt = new Date();
    await request.save();

    if (dto.status === ApplicationStatus.APPROVED) {
      await this.usersService.setLevel(request.userId, AccessLevel.ORGANIZER);
      await this.usersService.updateFields(request.userId, {
        schoolId: request.schoolId,
      });
    }
    return request;
  }

  async cancelOwn(
    id: string,
    user: AuthenticatedUser,
  ): Promise<OrganizerRequest> {
    const request = await this.findByIdOrFail(id);
    if (request.userId !== user.id) {
      throw new ForbiddenException(REQUEST_NOT_OWNED_MESSAGE);
    }
    if (request.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(REQUEST_NOT_PENDING_MESSAGE);
    }
    request.status = ApplicationStatus.CANCELLED;
    await request.save();
    return request;
  }

  private async findByIdOrFail(id: string): Promise<OrganizerRequest> {
    const request = await this.requestModel.findByPk(id);
    if (!request) {
      throw new NotFoundException(REQUEST_NOT_FOUND_MESSAGE);
    }
    return request;
  }
}
```

- [ ] **Step 5: Controller**

Create `backend/src/organizer-requests/organizer-requests.controller.ts`:

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MinLevelGuard } from '../auth/min-level.guard';
import { MinLevel } from '../auth/min-level.decorator';
import { AccessLevel } from '../auth/access-level.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ApplicationStatus } from '../competition-applications/application-status.enum';
import { OrganizerRequestsService } from './organizer-requests.service';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';
import { ReviewOrganizerRequestDto } from './dto/review-organizer-request.dto';
import { ORGANIZER_REQUESTS_ROUTE } from './organizer-requests.constants';

@ApiTags(ORGANIZER_REQUESTS_ROUTE)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, MinLevelGuard)
@Controller(ORGANIZER_REQUESTS_ROUTE)
export class OrganizerRequestsController {
  constructor(private readonly service: OrganizerRequestsService) {}

  @ApiOperation({ summary: 'Submit a request to become an organizer' })
  @ApiResponse({ status: 201, description: 'Request created.' })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizerRequestDto,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({ summary: 'Your own organizer requests' })
  @ApiResponse({ status: 200, description: 'Requests returned.' })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user);
  }

  @ApiOperation({ summary: 'All organizer requests (admin)' })
  @ApiResponse({ status: 200, description: 'Requests returned.' })
  @MinLevel(AccessLevel.ADMIN)
  @Get()
  findAll(@Query('status') status?: ApplicationStatus) {
    return this.service.findAll(status);
  }

  @ApiOperation({ summary: 'Approve or reject a request (admin)' })
  @ApiResponse({ status: 200, description: 'Request reviewed.' })
  @MinLevel(AccessLevel.ADMIN)
  @Patch(':id')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewOrganizerRequestDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.service.review(id, dto, admin);
  }

  @ApiOperation({ summary: 'Cancel your own pending request' })
  @ApiResponse({ status: 200, description: 'Request cancelled.' })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cancelOwn(id, user);
  }
}
```

- [ ] **Step 6: Module**

Create `backend/src/organizer-requests/organizer-requests.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '../users/users.module';
import { SchoolsModule } from '../schools/schools.module';
import { OrganizerRequest } from './organizer-request.model';
import { OrganizerRequestsService } from './organizer-requests.service';
import { OrganizerRequestsController } from './organizer-requests.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([OrganizerRequest]),
    UsersModule,
    SchoolsModule,
  ],
  controllers: [OrganizerRequestsController],
  providers: [OrganizerRequestsService],
})
export class OrganizerRequestsModule {}
```

- [ ] **Step 7: Register in `app.module.ts`**

Add the import and list it in `imports` after `CompetitionApplicationsModule`:

```ts
import { OrganizerRequestsModule } from './organizer-requests/organizer-requests.module';
```
```ts
    CompetitionApplicationsModule,
    OrganizerRequestsModule,
```

- [ ] **Step 8: Migration**

Create `backend/migrations/20260903100100-create-organizer-requests.ts`:

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('organizer_requests', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      schoolId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'schools', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      note: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...STATUSES),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      reviewedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      decisionNote: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // At most one PENDING request per user.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX organizer_requests_one_pending_per_user
      ON organizer_requests ("userId")
      WHERE status = 'PENDING'
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('organizer_requests');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_organizer_requests_status"',
    );
  },
};
```

- [ ] **Step 9: Migrate and verify**

Run: `cd backend && npm run migrate`
Expected: `== 20260903100100-create-organizer-requests: migrated`

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 10: Commit** (Developer runs this)

```bash
git add backend/src/organizer-requests backend/migrations/20260903100100-create-organizer-requests.ts backend/src/app.module.ts
git commit -m "feat(organizer-requests): admin-approved organizer application flow"
```

---

## Task 6: first-admin seed

**Files:**
- Create: `backend/src/app-bootstrap/app-bootstrap.constants.ts`
- Create: `backend/src/app-bootstrap/app-bootstrap.service.ts`
- Create: `backend/src/app-bootstrap/app-bootstrap.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `UsersService.findByEmail`, `UsersService.create` (existing, now takes `confirmed`); `ConfigService`; `SALT_ROUNDS` from `../auth/auth.constants`; `AccessLevel`.
- Produces: nothing importable; a boot side-effect.

- [ ] **Step 1: Constants**

Create `backend/src/app-bootstrap/app-bootstrap.constants.ts`:

```ts
export const ADMIN_EMAIL_ENV = 'ADMIN_EMAIL';
export const ADMIN_PASSWORD_ENV = 'ADMIN_PASSWORD';

export const SEED_ADMIN_FIRST_NAME = 'Адмін';
export const SEED_ADMIN_LAST_NAME = 'DanseFest';
export const SEED_ADMIN_PHONE_PREFIX = 'admin:';
```

- [ ] **Step 2: Service**

Create `backend/src/app-bootstrap/app-bootstrap.service.ts`:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AccessLevel } from '../auth/access-level.enum';
import { SALT_ROUNDS } from '../auth/auth.constants';
import {
  ADMIN_EMAIL_ENV,
  ADMIN_PASSWORD_ENV,
  SEED_ADMIN_FIRST_NAME,
  SEED_ADMIN_LAST_NAME,
  SEED_ADMIN_PHONE_PREFIX,
} from './app-bootstrap.constants';

@Injectable()
export class AppBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AppBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>(ADMIN_EMAIL_ENV);
    const password = this.config.get<string>(ADMIN_PASSWORD_ENV);
    if (!email || !password) {
      return;
    }
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.usersService.create({
      firstName: SEED_ADMIN_FIRST_NAME,
      lastName: SEED_ADMIN_LAST_NAME,
      phone: SEED_ADMIN_PHONE_PREFIX + randomUUID(),
      email,
      passwordHash,
      birthDate: null,
      accessLevel: AccessLevel.ADMIN,
      schoolId: null,
      coachId: null,
      confirmed: true,
    });
    this.logger.log(`Seeded first admin ${email}`);
  }
}
```

- [ ] **Step 3: Module**

Create `backend/src/app-bootstrap/app-bootstrap.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AppBootstrapService } from './app-bootstrap.service';

@Module({
  imports: [UsersModule],
  providers: [AppBootstrapService],
})
export class AppBootstrapModule {}
```

- [ ] **Step 4: Register in `app.module.ts`**

```ts
import { AppBootstrapModule } from './app-bootstrap/app-bootstrap.module';
```
```ts
    OrganizerRequestsModule,
    AppBootstrapModule,
```

- [ ] **Step 5: Document env vars**

Append to `backend/.env.example`:

```
# First admin, seeded on boot if no user with this email exists
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

- [ ] **Step 6: Verify**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

Run: `cd backend && ADMIN_EMAIL=admin@dansefest.test ADMIN_PASSWORD=changeme123 npm run start` (needs DB)
Expected: log line `Seeded first admin admin@dansefest.test`; second start does not repeat it.

- [ ] **Step 7: Commit** (Developer runs this)

```bash
git add backend/src/app-bootstrap backend/src/app.module.ts backend/.env.example
git commit -m "feat(bootstrap): seed first admin from env"
```

---

## Task 7: frontend lib layer + SchoolPicker

**Files:**
- Modify: `frontend/src/lib/roles.ts`
- Modify: `frontend/src/lib/auth.ts`
- Create: `frontend/src/lib/organizerRequests.constants.ts`
- Create: `frontend/src/lib/organizerRequests.ts`
- Create: `frontend/src/components/SchoolPicker.tsx`
- Create: `frontend/src/components/SchoolPicker.module.css`

**Interfaces:**
- Consumes: `authorizedFetch` from `./auth`; `getSchools`, `createSchool`, `School` from `./schools`; `ACCESS_LEVEL` from `./roles`.
- Produces:
  - `roles.ts`: `SELF_UPGRADABLE_LEVELS = [ACCESS_LEVEL.COACH]`
  - `auth.ts`: `RegisterPayload` gains `role: AccessLevel` and `schoolId?: string`; `getSelectableCoaches(): Promise<CoachSummary[]>`; `setMentorCoach(body: SetMentorCoachBody): Promise<{ coachId: string }>`
  - `CoachSummary { id; firstName; lastName; schoolName: string | null }`
  - `SetMentorCoachBody = { coachId: string } | { newCoach: { firstName; lastName; phone } }`
  - `organizerRequests.ts`: `OrganizerRequest`, `createOrganizerRequest`, `getMyOrganizerRequests`, `listOrganizerRequests`, `reviewOrganizerRequest`, `cancelOrganizerRequest`
  - `SchoolPicker` component with props `{ value: string; onChange: (schoolId: string) => void }`

- [ ] **Step 1: Narrow `SELF_UPGRADABLE_LEVELS`**

In `frontend/src/lib/roles.ts` replace:

```ts
// Levels a user can grant themselves (COACH only; ORGANIZER needs an
// admin-approved request, ADMIN is admin-granted).
export const SELF_UPGRADABLE_LEVELS: AccessLevel[] = [ACCESS_LEVEL.COACH];
```

- [ ] **Step 2: Extend `auth.ts`**

In `frontend/src/lib/auth.ts`:

Add to `RegisterPayload`:

```ts
  role: AccessLevel;
  schoolId?: string;
```

Add a `CoachSummary` interface and mentor-coach calls near `upgradeLevel`:

```ts
export interface CoachSummary {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
}

export type SetMentorCoachBody =
  | { coachId: string }
  | { newCoach: { firstName: string; lastName: string; phone: string } };

export async function getSelectableCoaches(): Promise<CoachSummary[]> {
  const response = await authorizedFetch('/users/coaches');
  if (!response.ok) {
    throw new AuthError(UNEXPECTED_SERVER_RESPONSE_MESSAGE);
  }
  return response.json() as Promise<CoachSummary[]>;
}

export async function setMentorCoach(
  body: SetMentorCoachBody,
): Promise<{ coachId: string }> {
  const response = await authorizedFetch('/users/me/coach', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & { coachId: string })
    | null;
  if (!response.ok) {
    throw new AuthError(
      extractErrorMessage(payload, LEVEL_UPGRADE_FAILED_MESSAGE),
    );
  }
  return payload as { coachId: string };
}
```

- [ ] **Step 3: organizer-requests constants**

Create `frontend/src/lib/organizerRequests.constants.ts`:

```ts
export const ORGANIZER_REQUEST_LOAD_FAILED_MESSAGE =
  'Не вдалося завантажити заявки.';
export const ORGANIZER_REQUEST_SUBMIT_FAILED_MESSAGE =
  'Не вдалося подати заявку.';
export const ORGANIZER_REQUEST_REVIEW_FAILED_MESSAGE =
  'Не вдалося оновити заявку.';
```

- [ ] **Step 4: organizer-requests API**

Create `frontend/src/lib/organizerRequests.ts`:

```ts
import { authorizedFetch } from './auth';
import {
  ORGANIZER_REQUEST_LOAD_FAILED_MESSAGE,
  ORGANIZER_REQUEST_REVIEW_FAILED_MESSAGE,
  ORGANIZER_REQUEST_SUBMIT_FAILED_MESSAGE,
} from './organizerRequests.constants';

export type OrganizerRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface OrganizerRequest {
  id: string;
  userId: string;
  schoolId: string;
  note: string | null;
  status: OrganizerRequestStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

interface ErrorPayload {
  message?: string | string[];
}

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message)
    ? payload.message.join(', ')
    : payload.message;
}

async function readJson<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & T)
    | null;
  if (!response.ok) {
    throw new Error(extractMessage(payload, fallback));
  }
  return payload as T;
}

export async function createOrganizerRequest(body: {
  schoolId: string;
  note?: string;
}): Promise<OrganizerRequest> {
  const response = await authorizedFetch('/organizer-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readJson<OrganizerRequest>(
    response,
    ORGANIZER_REQUEST_SUBMIT_FAILED_MESSAGE,
  );
}

export async function getMyOrganizerRequests(): Promise<OrganizerRequest[]> {
  const response = await authorizedFetch('/organizer-requests/me');
  return readJson<OrganizerRequest[]>(
    response,
    ORGANIZER_REQUEST_LOAD_FAILED_MESSAGE,
  );
}

export async function listOrganizerRequests(
  status?: OrganizerRequestStatus,
): Promise<OrganizerRequest[]> {
  const query = status ? `?status=${status}` : '';
  const response = await authorizedFetch(`/organizer-requests${query}`);
  return readJson<OrganizerRequest[]>(
    response,
    ORGANIZER_REQUEST_LOAD_FAILED_MESSAGE,
  );
}

export async function reviewOrganizerRequest(
  id: string,
  body: { status: 'APPROVED' | 'REJECTED'; decisionNote?: string },
): Promise<OrganizerRequest> {
  const response = await authorizedFetch(`/organizer-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readJson<OrganizerRequest>(
    response,
    ORGANIZER_REQUEST_REVIEW_FAILED_MESSAGE,
  );
}

export async function cancelOrganizerRequest(
  id: string,
): Promise<OrganizerRequest> {
  const response = await authorizedFetch(`/organizer-requests/${id}/cancel`, {
    method: 'PATCH',
  });
  return readJson<OrganizerRequest>(
    response,
    ORGANIZER_REQUEST_REVIEW_FAILED_MESSAGE,
  );
}
```

- [ ] **Step 5: `SchoolPicker` component**

Create `frontend/src/components/SchoolPicker.tsx` — the select-or-create block lifted verbatim from `LevelUpgrade.tsx` (lines ~104-126), made reusable:

```tsx
import { useEffect, useState } from 'react';
import { createSchool, getSchools } from '../lib/schools';
import type { School } from '../lib/schools';
import styles from './SchoolPicker.module.css';

interface SchoolPickerProps {
  value: string;
  onChange: (schoolId: string) => void;
}

// Resolves to an existing school id, or creates one from a typed name and
// then reports its id. The parent only ever receives a real school id.
export default function SchoolPicker({ value, onChange }: SchoolPickerProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]));
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const school = await createSchool(name);
      setSchools((prev) => [...prev, school]);
      onChange(school.id);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити школу.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>Школа / студія</label>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Оберіть школу…</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {!value && (
        <div className={styles.createRow}>
          <input
            className={styles.input}
            placeholder="…або впишіть нову назву"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className={styles.createBtn}
            disabled={creating || !newName.trim()}
            onClick={handleCreate}
          >
            {creating ? '…' : 'Додати'}
          </button>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
```

Create `frontend/src/components/SchoolPicker.module.css`:

```css
.wrap { display: grid; gap: 6px; }
.label { font-size: 13px; font-weight: 600; }
.select,
.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border, #d0d5dd);
  border-radius: 8px;
  font: inherit;
}
.createRow { display: flex; gap: 8px; }
.createBtn {
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.createBtn:disabled { opacity: 0.5; cursor: default; }
.error { color: #b42318; font-size: 13px; margin: 0; }
```

- [ ] **Step 6: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors. (Callers of `register()` are still missing `role` — fixed in Task 8. If tsc flags `RegisterPage.tsx` here, that is expected; complete Task 8 before considering the frontend green.)

- [ ] **Step 7: Commit** (Developer runs this)

```bash
git add frontend/src/lib/roles.ts frontend/src/lib/auth.ts frontend/src/lib/organizerRequests.ts frontend/src/lib/organizerRequests.constants.ts frontend/src/components/SchoolPicker.tsx frontend/src/components/SchoolPicker.module.css
git commit -m "feat(fe): role in register payload, organizer-requests lib, SchoolPicker"
```

---

## Task 8: RegisterPage role toggle

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx`

**Interfaces:**
- Consumes: `SchoolPicker` (Task 7); `register` with `role`/`schoolId` (Task 7); `ACCESS_LEVEL` from `../lib/roles`.

- [ ] **Step 1: Add role + school state and UI**

In `frontend/src/pages/RegisterPage.tsx`:

Add imports:

```ts
import SchoolPicker from '../components/SchoolPicker';
import { ACCESS_LEVEL } from '../lib/roles';
import type { AccessLevel } from '../lib/roles';
```

Add state near the other `useState` calls:

```ts
  const [role, setRole] = useState<AccessLevel>(ACCESS_LEVEL.PARTICIPANT);
  const [schoolId, setSchoolId] = useState('');
```

In `handleSubmit`, before `setSubmitting(true)`:

```ts
    if (role === ACCESS_LEVEL.COACH && !schoolId) {
      setError('Оберіть або створіть школу.');
      return;
    }
```

Change the `register({...})` call to include:

```ts
        role,
        schoolId: role === ACCESS_LEVEL.COACH ? schoolId : undefined,
```

Replace the subtitle text:

```tsx
        <p className={styles.subtitle}>
          Оберіть, як ви берете участь. Організатором можна стати згодом за
          заявкою.
        </p>
```

Add the toggle immediately above the "Ім'я / Прізвище" row inside `<form>`:

```tsx
          <div className={styles.field}>
            <label>Я реєструюсь як</label>
            <div className={styles.roleToggle}>
              <button
                type="button"
                className={role === ACCESS_LEVEL.PARTICIPANT ? styles.roleOn : styles.roleOff}
                onClick={() => setRole(ACCESS_LEVEL.PARTICIPANT)}
              >
                Учасник
              </button>
              <button
                type="button"
                className={role === ACCESS_LEVEL.COACH ? styles.roleOn : styles.roleOff}
                onClick={() => setRole(ACCESS_LEVEL.COACH)}
              >
                Тренер
              </button>
            </div>
          </div>
```

Add the school picker immediately below the birth-date field, gated on role:

```tsx
          {role === ACCESS_LEVEL.COACH && (
            <div className={styles.field}>
              <SchoolPicker value={schoolId} onChange={setSchoolId} />
            </div>
          )}
```

- [ ] **Step 2: Toggle styles**

Append to `frontend/src/pages/LoginPage.module.css`:

```css
.roleToggle { display: flex; gap: 8px; }
.roleOn,
.roleOff {
  flex: 1;
  padding: 9px 0;
  border-radius: 8px;
  border: 1px solid #2563eb;
  cursor: pointer;
  font: inherit;
}
.roleOn { background: #2563eb; color: #fff; }
.roleOff { background: transparent; color: #2563eb; }
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

Manual: `/register`, toggle **Тренер** → school picker appears; submitting without a school shows the inline error; **Учасник** registers as before.

- [ ] **Step 4: Commit** (Developer runs this)

```bash
git add frontend/src/pages/RegisterPage.tsx frontend/src/pages/LoginPage.module.css
git commit -m "feat(fe): choose participant or coach at registration"
```

---

## Task 9: LevelUpgrade rework + organizer-request form

**Files:**
- Modify: `frontend/src/components/LevelUpgrade.tsx`
- Modify: `frontend/src/components/LevelUpgrade.module.css`
- Create: `frontend/src/components/OrganizerRequestForm.tsx`
- Create: `frontend/src/components/OrganizerRequestForm.module.css`

**Interfaces:**
- Consumes: `SchoolPicker` (Task 7); `createOrganizerRequest`, `getMyOrganizerRequests`, `OrganizerRequest` (Task 7); `upgradeLevel` with `ACCESS_LEVEL.COACH`; `meetsLevel`, `ACCESS_LEVEL` from `../lib/roles`.

- [ ] **Step 1: `OrganizerRequestForm`**

Create `frontend/src/components/OrganizerRequestForm.tsx`:

```tsx
import { useEffect, useState } from 'react';
import SchoolPicker from './SchoolPicker';
import {
  createOrganizerRequest,
  getMyOrganizerRequests,
} from '../lib/organizerRequests';
import type { OrganizerRequest } from '../lib/organizerRequests';
import styles from './OrganizerRequestForm.module.css';

const STATUS_LABELS: Record<OrganizerRequest['status'], string> = {
  PENDING: 'На розгляді',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
  CANCELLED: 'Скасовано',
};

export default function OrganizerRequestForm() {
  const [latest, setLatest] = useState<OrganizerRequest | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrganizerRequests()
      .then((rows) => setLatest(rows[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  const submit = async () => {
    if (!schoolId) {
      setError('Оберіть або створіть школу.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createOrganizerRequest({
        schoolId,
        note: note.trim() || undefined,
      });
      setLatest(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося подати заявку.');
    } finally {
      setBusy(false);
    }
  };

  if (latest && latest.status === 'PENDING') {
    return (
      <p className={styles.status}>
        Заявка на організатора: <strong>{STATUS_LABELS[latest.status]}</strong>
      </p>
    );
  }

  return (
    <div className={styles.form}>
      {latest && (
        <p className={styles.status}>
          Попередня заявка: <strong>{STATUS_LABELS[latest.status]}</strong>
          {latest.decisionNote ? ` — ${latest.decisionNote}` : ''}
        </p>
      )}
      <SchoolPicker value={schoolId} onChange={setSchoolId} />
      <textarea
        className={styles.note}
        placeholder="Кілька слів про себе (необовʼязково)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <p className={styles.error}>{error}</p>}
      <button
        type="button"
        className={styles.submit}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '…' : 'Подати заявку на організатора'}
      </button>
    </div>
  );
}
```

Create `frontend/src/components/OrganizerRequestForm.module.css`:

```css
.form { display: grid; gap: 10px; }
.note {
  width: 100%;
  min-height: 64px;
  padding: 8px 10px;
  border: 1px solid var(--border, #d0d5dd);
  border-radius: 8px;
  font: inherit;
  resize: vertical;
}
.submit {
  padding: 9px 14px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.submit:disabled { opacity: 0.5; cursor: default; }
.status { font-size: 14px; margin: 0; }
.error { color: #b42318; font-size: 13px; margin: 0; }
```

- [ ] **Step 2: Rework `LevelUpgrade.tsx`**

Replace the file body so that: the coach path uses `SchoolPicker`; the "Стати організатором" button and `run(() => upgradeLevel(ACCESS_LEVEL.ORGANIZER))` are gone; an organizer entry renders `OrganizerRequestForm`.

```tsx
import { useState } from 'react';
import { AuthError, upgradeLevel } from '../lib/auth';
import type { Session } from '../lib/auth';
import { ACCESS_LEVEL, ACCESS_LEVEL_LABELS, meetsLevel } from '../lib/roles';
import SchoolPicker from './SchoolPicker';
import OrganizerRequestForm from './OrganizerRequestForm';
import styles from './LevelUpgrade.module.css';

interface LevelUpgradeProps {
  session: Session;
}

type Mode = 'idle' | 'coach' | 'organizer';

export default function LevelUpgrade({ session }: LevelUpgradeProps) {
  const { accessLevel } = session;
  const canBeCoach = !meetsLevel(accessLevel, ACCESS_LEVEL.COACH);
  const canRequestOrganizer = !meetsLevel(accessLevel, ACCESS_LEVEL.ORGANIZER);

  const [mode, setMode] = useState<Mode>('idle');
  const [schoolId, setSchoolId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (accessLevel === ACCESS_LEVEL.ADMIN) {
    return null;
  }

  const becomeCoach = async () => {
    if (!schoolId) {
      setError('Оберіть або створіть школу.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upgradeLevel(ACCESS_LEVEL.COACH, schoolId);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : 'Не вдалося змінити рівень.',
      );
      setBusy(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.label}>Рівень доступу</div>
      <p className={styles.current}>
        Зараз: <strong>{ACCESS_LEVEL_LABELS[accessLevel]}</strong>
      </p>

      {error && <p className={styles.error}>{error}</p>}

      {mode === 'idle' && (
        <div className={styles.actions}>
          {canBeCoach && (
            <button
              type="button"
              className={styles.primary}
              onClick={() => setMode('coach')}
            >
              Стати тренером
            </button>
          )}
          {canRequestOrganizer && (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('organizer')}
            >
              Стати організатором
            </button>
          )}
        </div>
      )}

      {mode === 'coach' && (
        <div className={styles.coachForm}>
          <SchoolPicker value={schoolId} onChange={setSchoolId} />
          <p className={styles.hint}>
            Після цього ви зможете додавати своїх учасників під час подачі
            заявки.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={becomeCoach}
            >
              {busy ? '…' : 'Підтвердити'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={busy}
              onClick={() => setMode('idle')}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {mode === 'organizer' && (
        <div className={styles.coachForm}>
          <OrganizerRequestForm />
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setMode('idle')}
          >
            Назад
          </button>
        </div>
      )}
    </section>
  );
}
```

Remove the now-unused `getSchools` / `createSchool` / `School` imports and the `schools` / `newSchoolName` state (they moved into `SchoolPicker`). `LevelUpgrade.module.css` needs no change (reuses `.coachForm`, `.actions`, `.hint`, `.primary`, `.ghost`).

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

Manual: as a PARTICIPANT on `/profile` → "Стати організатором" shows the school picker + note + submit; submitting shows the PENDING status; "Стати тренером" still works.

- [ ] **Step 4: Commit** (Developer runs this)

```bash
git add frontend/src/components/LevelUpgrade.tsx frontend/src/components/LevelUpgrade.module.css frontend/src/components/OrganizerRequestForm.tsx frontend/src/components/OrganizerRequestForm.module.css
git commit -m "feat(fe): organizer becomes a request, coach path uses SchoolPicker"
```

---

## Task 10: MentorCoachField + ProfilePage wiring

**Files:**
- Create: `frontend/src/components/MentorCoachField.tsx`
- Create: `frontend/src/components/MentorCoachField.module.css`
- Modify: `frontend/src/pages/ProfilePage.tsx`

**Interfaces:**
- Consumes: `getSelectableCoaches`, `setMentorCoach`, `CoachSummary` (Task 7); `MyProfile` from `../lib/users`; `ACCESS_LEVEL`, `meetsLevel` from `../lib/roles`.

- [ ] **Step 1: `MentorCoachField`**

Create `frontend/src/components/MentorCoachField.tsx`:

```tsx
import { useEffect, useState } from 'react';
import {
  getSelectableCoaches,
  setMentorCoach,
} from '../lib/auth';
import type { CoachSummary } from '../lib/auth';
import styles from './MentorCoachField.module.css';

interface MentorCoachFieldProps {
  currentCoachId: string | null;
}

type Mode = 'view' | 'pick' | 'new';

export default function MentorCoachField({
  currentCoachId,
}: MentorCoachFieldProps) {
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [mode, setMode] = useState<Mode>('view');
  const [pickId, setPickId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [savedId, setSavedId] = useState<string | null>(currentCoachId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSelectableCoaches()
      .then(setCoaches)
      .catch(() => setCoaches([]));
  }, []);

  const currentName = (() => {
    const found = coaches.find((c) => c.id === savedId);
    return found ? `${found.lastName} ${found.firstName}` : null;
  })();

  const save = async (body: Parameters<typeof setMentorCoach>[0]) => {
    setBusy(true);
    setError(null);
    try {
      const { coachId } = await setMentorCoach(body);
      setSavedId(coachId);
      setMode('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.label}>Ваш тренер</div>

      {mode === 'view' && (
        <div className={styles.viewRow}>
          <span>{currentName ?? (savedId ? 'Призначений' : 'Не вказано')}</span>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('pick')}
            >
              Обрати
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('new')}
            >
              Вписати нового
            </button>
          </div>
        </div>
      )}

      {mode === 'pick' && (
        <div className={styles.form}>
          <select
            className={styles.select}
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
          >
            <option value="">Оберіть тренера…</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName} {c.firstName}
                {c.schoolName ? ` — ${c.schoolName}` : ''}
              </option>
            ))}
          </select>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || !pickId}
              onClick={() => save({ coachId: pickId })}
            >
              Зберегти
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('view')}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {mode === 'new' && (
        <div className={styles.form}>
          <input
            className={styles.input}
            placeholder="Імʼя"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Прізвище"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={
                busy ||
                !firstName.trim() ||
                !lastName.trim() ||
                !phone.trim()
              }
              onClick={() =>
                save({
                  newCoach: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone.trim(),
                  },
                })
              }
            >
              Зберегти
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('view')}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
```

Create `frontend/src/components/MentorCoachField.module.css`:

```css
.card {
  border: 1px solid var(--border, #e4e7ec);
  border-radius: 12px;
  padding: 16px;
  display: grid;
  gap: 10px;
}
.label { font-size: 13px; font-weight: 700; text-transform: uppercase; }
.viewRow { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.form { display: grid; gap: 8px; }
.select,
.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border, #d0d5dd);
  border-radius: 8px;
  font: inherit;
}
.actions { display: flex; gap: 8px; }
.primary {
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.primary:disabled { opacity: 0.5; cursor: default; }
.ghost {
  padding: 8px 12px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}
.error { color: #b42318; font-size: 13px; margin: 0; }
```

- [ ] **Step 2: Wire into `ProfilePage.tsx`**

Add imports:

```ts
import MentorCoachField from '../components/MentorCoachField';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
```

After `<LevelUpgrade session={session} />`:

```tsx
              {meetsLevel(profile.accessLevel, ACCESS_LEVEL.COACH) && (
                <MentorCoachField currentCoachId={profile.coachId} />
              )}
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

Manual: as a COACH on `/profile` → "Ваш тренер" card; "Вписати нового" with all three fields saves and shows "Призначений".

- [ ] **Step 4: Commit** (Developer runs this)

```bash
git add frontend/src/components/MentorCoachField.tsx frontend/src/components/MentorCoachField.module.css frontend/src/pages/ProfilePage.tsx
git commit -m "feat(fe): mentor coach field on the profile"
```

---

## Task 11: admin OrganizerRequestsPage + route

**Files:**
- Create: `frontend/src/pages/OrganizerRequestsPage.tsx`
- Create: `frontend/src/pages/OrganizerRequestsPage.module.css`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/ProfilePage.tsx`

**Interfaces:**
- Consumes: `listOrganizerRequests`, `reviewOrganizerRequest`, `OrganizerRequest` (Task 7); `getSession` from `../lib/auth`; `ACCESS_LEVEL`, `meetsLevel` from `../lib/roles`.

- [ ] **Step 1: The page**

Create `frontend/src/pages/OrganizerRequestsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import PublicTopBar from '../components/PublicTopBar';
import { getSession } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import {
  listOrganizerRequests,
  reviewOrganizerRequest,
} from '../lib/organizerRequests';
import type { OrganizerRequest } from '../lib/organizerRequests';
import styles from './OrganizerRequestsPage.module.css';

const STATUS_LABELS: Record<OrganizerRequest['status'], string> = {
  PENDING: 'На розгляді',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
  CANCELLED: 'Скасовано',
};

export default function OrganizerRequestsPage() {
  const session = getSession();
  const [rows, setRows] = useState<OrganizerRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    listOrganizerRequests()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Помилка завантаження.'),
      );
  };

  useEffect(load, []);

  if (!session || !meetsLevel(session.accessLevel, ACCESS_LEVEL.ADMIN)) {
    return <Navigate to="/login" replace />;
  }

  const decide = async (
    id: string,
    status: 'APPROVED' | 'REJECTED',
  ) => {
    setBusyId(id);
    setError(null);
    try {
      const decisionNote =
        status === 'REJECTED'
          ? window.prompt('Причина відмови (необовʼязково)') ?? undefined
          : undefined;
      await reviewOrganizerRequest(id, { status, decisionNote });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося оновити.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.page}>
      <PublicTopBar />
      <main className={styles.main}>
        <h1 className={styles.title}>Заявки на організатора</h1>
        {error && <p className={styles.error}>{error}</p>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Користувач</th>
              <th>Школа</th>
              <th>Коментар</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.userId}</td>
                <td>{r.schoolId}</td>
                <td>{r.note ?? '—'}</td>
                <td>{STATUS_LABELS[r.status]}</td>
                <td>
                  {r.status === 'PENDING' && (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, 'APPROVED')}
                      >
                        Схвалити
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, 'REJECTED')}
                      >
                        Відхилити
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
```

Create `frontend/src/pages/OrganizerRequestsPage.module.css`:

```css
.page { min-height: 100vh; background: var(--bg, #f7f8fa); }
.main { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
.title { font-size: 22px; margin: 0 0 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th,
.table td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border, #e4e7ec);
  vertical-align: top;
}
.actions { display: flex; gap: 8px; }
.actions button {
  padding: 6px 10px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: #fff;
  color: #2563eb;
  cursor: pointer;
}
.error { color: #b42318; }
```

- [ ] **Step 2: Route**

In `frontend/src/App.tsx` add:

```ts
import OrganizerRequestsPage from './pages/OrganizerRequestsPage';
```
```tsx
        <Route path="/organizer-requests" element={<OrganizerRequestsPage />} />
```

- [ ] **Step 3: Admin link on the profile**

In `frontend/src/pages/ProfilePage.tsx`, after the `MentorCoachField` block:

```tsx
              {meetsLevel(profile.accessLevel, ACCESS_LEVEL.ADMIN) && (
                <a className={styles.adminLink} href="/organizer-requests">
                  Заявки на організатора
                </a>
              )}
```

Append to `frontend/src/pages/ProfilePage.module.css`:

```css
.adminLink {
  display: inline-block;
  margin-top: 8px;
  color: #2563eb;
  font-weight: 600;
}
```

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

Manual (full loop): register as coach A → profile → request organizer (school S) → log in as the seeded admin → `/organizer-requests` → Схвалити → coach A refreshes session (re-login) → `accessLevel` is `ORGANIZER`, `schoolId` = S.

- [ ] **Step 5: Commit** (Developer runs this)

```bash
git add frontend/src/pages/OrganizerRequestsPage.tsx frontend/src/pages/OrganizerRequestsPage.module.css frontend/src/App.tsx frontend/src/pages/ProfilePage.tsx frontend/src/pages/ProfilePage.module.css
git commit -m "feat(fe): admin page to review organizer requests"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| Pure ladder (kept) | no change — verified guards untouched |
| Registration chooses role + coach school | Task 4 (DTO/service), Task 8 (UI) |
| Only `→ ORGANIZER` needs approval | Task 5 (module), Task 2 (`selfUpgrade` COACH-only), Task 9 (UI drops organizer self-upgrade) |
| Roster "номер" = phone, birth date required | existing DTO already enforces; Task 1 sets `confirmed: false` on roster create |
| `confirmed` column + semantics | Task 1 |
| `createPlaceholderCoach` de-dup by phone | Task 2 |
| Mentor coach `PATCH /users/me/coach` + `GET /users/coaches` | Task 3 (backend), Task 10 (UI) |
| Registration over a stub (`register` merge) | Task 4 |
| `completeClaim` sets `confirmed` | Task 4 |
| `organizer_requests` table + endpoints | Task 5 |
| Approve → `setLevel(ORGANIZER)` + `schoolId` | Task 5 service `review` |
| First-admin seed from env | Task 6 |
| Revocation = admin picks level | no new code — `PATCH /users/:id/level` (`setLevel`) already exists; noted, no task needed |
| `SELF_UPGRADABLE_LEVELS` → `[COACH]` (be + fe) | Task 2 (be enum), Task 7 (fe) |
| `SchoolPicker` shared by 3 sites | Task 7 (create), Task 8 + Task 9 (consume) |
| `MentorCoachField` on profile | Task 10 |
| Admin review screen | Task 11 |
| Migrations sort after `access-level-ladder` | Task 1 (`20260903100000`), Task 5 (`20260903100100`) |
| Judges untouched | no task touches `judges/` |

Spec "Open questions": both resolved to the permissive option in the spec text and reflected here — reject allows immediate re-apply (no cooldown code); `linkRegistration` overwrites `firstName`/`lastName` with the registrant's input (Task 4 Step 2).

**2. Placeholder scan** — no `TBD`/`TODO`; every code step carries real code; "similar to Task N" is not used (SchoolPicker/OrganizerRequestForm code repeated where consumed).

**3. Type consistency**
- `confirmed: boolean` — `user.model.ts`, `CreateUserData`, `LinkRegistrationFields`, migration backfill — consistent.
- `createPlaceholderCoach(data: PlaceholderCoachData)` — defined Task 2, consumed Task 3 controller — signature matches.
- `setMentorCoach(userId, coachId)` service vs `setMentorCoach(body)` in `lib/auth.ts` — different layers, intentional; the frontend one returns `{ coachId: string }`, matching the controller's return.
- `ReviewOrganizerRequestDto.status` is `APPROVED | REJECTED`; controller `findAll` accepts the full `ApplicationStatus`; frontend `reviewOrganizerRequest` body typed `'APPROVED' | 'REJECTED'` — consistent.
- `OrganizerRequest` fields (`reviewedByUserId`, `reviewedAt`, `decisionNote`, `note`, `status`) identical across model, migration, and `lib/organizerRequests.ts`.
- `SELF_UPGRADABLE` in `upgrade-level.dto.ts` and `SELF_UPGRADABLE_LEVELS` in `access-level.enum.ts` / `roles.ts` all reduced to `[COACH]`.

No gaps found.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-03-role-access-and-organizer-approval.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — tasks run in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
