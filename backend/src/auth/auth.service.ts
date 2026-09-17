import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.model';
import { AccessLevel, isHigherLevel } from './access-level.enum';
import { RegisterDto } from './dto/register.dto';
import { RegisterConfirmDto } from './dto/register-confirm.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { OtpResendDto } from './dto/otp-resend.dto';
import { JwtPayload, RefreshTokenPayload } from './jwt-payload.interface';
import { SessionStoreService } from './session-store.service';
import { ClientContext } from './client-context.interface';
import { OtpService } from './otp.service';
import { OtpRequired } from './otp-required.interface';
import { isRealPhone, maskPhone } from './mask-phone';
import {
  DEFAULT_REFRESH_EXPIRES_IN_SECONDS,
  EMAIL_TAKEN_MESSAGE,
  PHONE_TAKEN_MESSAGE,
  FINGERPRINT_MISMATCH_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  MIN_PASSWORD_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
  REFRESH_TOKEN_REVOKED_MESSAGE,
  SALT_ROUNDS,
} from './auth.constants';
import { AuthResult } from './auth-result.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionStore: SessionStoreService,
    private readonly otpService: OtpService,
  ) {}

  // Registration step 1: make sure the form can become an account, then
  // text a code to the phone. Nothing is stored until step 2.
  async startRegistration(dto: RegisterDto): Promise<{ phone: string }> {
    const phone = dto.phone.trim();
    await this.assertRegistrable(phone, dto.email);
    await this.otpService.start(phone);
    return { phone: maskPhone(phone) };
  }

  // Registration step 2: the account is created only after the SMS code
  // proves the phone belongs to the person registering.
  async register(
    dto: RegisterConfirmDto,
    ctx: ClientContext,
  ): Promise<AuthResult> {
    // A coach names their school later, on /complete-profile.
    const phone = dto.phone.trim();
    // Re-checked: another account may have taken the phone or email
    // between the two steps.
    const byPhone = await this.assertRegistrable(phone, dto.email);
    await this.otpService.verify(phone, dto.code);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // The real person is claiming a stub someone named for them: fold the
    // form data into that row, keeping its id so every coachId /
    // participantId pointing at it stays valid.
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
          dto.role === AccessLevel.COACH
            ? (dto.schoolId ?? byPhone.schoolId)
            : byPhone.schoolId,
        confirmed: true,
      });
      return this.issueSession(linked, ctx);
    }

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone,
      email: dto.email,
      passwordHash,
      birthDate: dto.birthDate,
      accessLevel: dto.role,
      schoolId: dto.role === AccessLevel.COACH ? (dto.schoolId ?? null) : null,
      coachId: null,
      confirmed: true,
    });
    return this.issueSession(user, ctx);
  }

  // Throws when the phone or email already belongs to a real account.
  // Returns the unconfirmed stub registered under this phone, if any, so
  // registration can claim it.
  private async assertRegistrable(
    phone: string,
    email: string,
  ): Promise<User | null> {
    const [byPhone, byEmail] = await Promise.all([
      this.usersService.findByPhone(phone),
      this.usersService.findByEmail(email),
    ]);
    if (byPhone && byPhone.confirmed) {
      throw new UnauthorizedException(PHONE_TAKEN_MESSAGE);
    }
    // A stub being claimed may already carry this email — that is not a clash.
    if (byEmail && byEmail.id !== byPhone?.id) {
      throw new UnauthorizedException(EMAIL_TAKEN_MESSAGE);
    }
    return byPhone;
  }

  async login(
    dto: LoginDto,
    ctx: ClientContext,
  ): Promise<AuthResult | OtpRequired> {
    const user = await this.usersService.findByPhone(dto.login.trim());
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.passwordHash) {
      await this.assertPassword(user.passwordHash, dto.password);
      return this.issueSession(user, ctx);
    }

    // First login: no password yet — verify the phone with an SMS code.
    if (dto.password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(PASSWORD_TOO_SHORT_MESSAGE);
    }
    if (!isRealPhone(user.phone)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
    await this.otpService.start(user.phone);
    return { otpRequired: true, phone: maskPhone(user.phone) };
  }

  async refresh(dto: RefreshTokenDto, ctx: ClientContext): Promise<AuthResult> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const session = await this.sessionStore.findActive(
      payload.sub,
      payload.jti,
    );
    if (!session) {
      throw new UnauthorizedException(REFRESH_TOKEN_REVOKED_MESSAGE);
    }
    if (
      session.fingerprint &&
      ctx.fingerprint &&
      session.fingerprint !== ctx.fingerprint
    ) {
      await this.sessionStore.revoke(payload.sub, payload.jti);
      throw new UnauthorizedException(FINGERPRINT_MISMATCH_MESSAGE);
    }
    await this.sessionStore.revoke(payload.sub, payload.jti);

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Недійсний refresh-токен');
    return this.issueSession(user, ctx);
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    await this.sessionStore.revoke(payload.sub, payload.jti);
  }

  // First login, step 2: check the SMS code, set the password the user
  // chose, and issue a session. `confirmed` flips true inside claimAccount.
  async verifyOtp(dto: OtpVerifyDto, ctx: ClientContext): Promise<AuthResult> {
    const user = await this.usersService.findByPhone(dto.login.trim());
    if (!user || !isRealPhone(user.phone)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
    await this.otpService.verify(user.phone, dto.code);
    await this.usersService.claimAccount(
      user.id,
      await bcrypt.hash(dto.password, SALT_ROUNDS),
    );
    return this.issueSession(
      await this.usersService.findByIdOrFail(user.id),
      ctx,
    );
  }

  async resendOtp(dto: OtpResendDto): Promise<{ phone: string }> {
    const user = await this.usersService.findByPhone(dto.login.trim());
    if (!user || user.passwordHash || !isRealPhone(user.phone)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
    await this.otpService.start(user.phone);
    return { phone: maskPhone(user.phone) };
  }

  // Forgot password, step 1: an existing account requests an SMS code to
  // prove phone ownership before choosing a new password.
  async forgotPassword(dto: OtpResendDto): Promise<{ phone: string }> {
    const user = await this.usersService.findByPhone(dto.login.trim());
    if (!user || !user.passwordHash || !isRealPhone(user.phone)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
    await this.otpService.start(user.phone);
    return { phone: maskPhone(user.phone) };
  }

  // Forgot password, step 2: verify the SMS code and replace the password.
  async resetPassword(
    dto: OtpVerifyDto,
    ctx: ClientContext,
  ): Promise<AuthResult> {
    const user = await this.usersService.findByPhone(dto.login.trim());
    if (!user || !user.passwordHash || !isRealPhone(user.phone)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
    await this.otpService.verify(user.phone, dto.code);
    await this.usersService.setPassword(
      user.id,
      await bcrypt.hash(dto.password, SALT_ROUNDS),
    );
    return this.issueSession(
      await this.usersService.findByIdOrFail(user.id),
      ctx,
    );
  }

  private async assertPassword(
    passwordHash: string | null | undefined,
    password: string,
  ): Promise<void> {
    if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  private async issueSession(
    user: User,
    ctx: ClientContext,
  ): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
      accessLevel: user.accessLevel,
    };
    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      ...payload,
      type: 'refresh',
      jti,
    };
    const refreshExpiresIn =
      Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) ||
      DEFAULT_REFRESH_EXPIRES_IN_SECONDS;

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.refreshSecret(),
      expiresIn: refreshExpiresIn,
    });
    await this.sessionStore.create(user.id, jti, ctx);

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        birthDate: user.birthDate,
        accessLevel: user.accessLevel,
        schoolId: user.schoolId,
        coachId: user.coachId,
      },
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException(
        'Недійсний або прострочений refresh-токен',
      );
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Недійсний refresh-токен');
    }
    return payload;
  }

  private refreshSecret(): string {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET не налаштований');
    }
    return secret;
  }
}
