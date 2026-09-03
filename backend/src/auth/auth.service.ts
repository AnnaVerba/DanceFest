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
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { OtpResendDto } from './dto/otp-resend.dto';
import { JwtPayload, RefreshTokenPayload } from './jwt-payload.interface';
import { RefreshTokenStoreService } from './refresh-token-store.service';
import { OtpService } from './otp.service';
import { OtpRequired } from './otp-required.interface';
import { isRealPhone, maskPhone } from './mask-phone';
import {
  DEFAULT_REFRESH_EXPIRES_IN_SECONDS,
  EMAIL_OR_PHONE_TAKEN_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  MIN_PASSWORD_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
  REFRESH_TOKEN_REVOKED_MESSAGE,
  SALT_ROUNDS,
} from './auth.constants';
import { AuthResult } from './auth-result.interface';
import { SCHOOL_REQUIRED_FOR_COACH_MESSAGE } from '../users/users.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenStore: RefreshTokenStoreService,
    private readonly otpService: OtpService,
  ) {}

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

  async login(dto: LoginDto): Promise<AuthResult | OtpRequired> {
    const user = await this.usersService.findByEmailOrPhone(dto.login.trim());
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.passwordHash) {
      await this.assertPassword(user.passwordHash, dto.password);
      return this.issueSession(user);
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

  async refresh(dto: RefreshTokenDto): Promise<AuthResult> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const isActive = await this.refreshTokenStore.isActive(
      payload.sub,
      payload.jti,
    );
    if (!isActive) {
      throw new UnauthorizedException(REFRESH_TOKEN_REVOKED_MESSAGE);
    }
    await this.refreshTokenStore.revoke(payload.sub, payload.jti);

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Недійсний refresh-токен');
    return this.issueSession(user);
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    await this.refreshTokenStore.revoke(payload.sub, payload.jti);
  }

  // First login, step 2: check the SMS code, set the password the user
  // chose, and issue a session. `confirmed` flips true inside claimAccount.
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

  private async assertPassword(
    passwordHash: string | null | undefined,
    password: string,
  ): Promise<void> {
    if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  private async issueSession(user: User): Promise<AuthResult> {
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
    await this.refreshTokenStore.save(user.id, jti);

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
