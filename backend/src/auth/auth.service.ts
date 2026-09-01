import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { AdminsService } from '../admins/admins.service';
import { ParticipantsService } from '../participants/participants.service';
import { CoachesService } from '../coaches/coaches.service';
import { OrganizersService } from '../organizers/organizers.service';
import { SchoolsService } from '../schools/schools.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload, RefreshTokenPayload } from './jwt-payload.interface';
import { Role } from './roles.enum';
import { RefreshTokenStoreService } from './refresh-token-store.service';
import {
  DEFAULT_REFRESH_EXPIRES_IN_SECONDS,
  EMAIL_OR_PHONE_TAKEN_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  REFRESH_TOKEN_REVOKED_MESSAGE,
  SALT_ROUNDS,
} from './auth.constants';
import { AuthResult } from './auth-result.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly participantsService: ParticipantsService,
    private readonly coachesService: CoachesService,
    private readonly organizersService: OrganizersService,
    private readonly schoolsService: SchoolsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenStore: RefreshTokenStoreService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    switch (dto.role) {
      case Role.ADMIN:
        return this.registerAdmin(dto);
      case Role.PARTICIPANT:
        return this.registerParticipant(dto);
      case Role.COACH:
        return this.registerCoach(dto);
      case Role.ORGANIZER:
        return this.registerOrganizer(dto);
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    switch (dto.role) {
      case Role.ADMIN: {
        const admin = await this.adminsService.findByEmail(dto.email);
        await this.assertPassword(admin?.passwordHash, dto.password);
        return this.issueSession(admin!.id, admin!.email, Role.ADMIN, {
          admin: {
            id: admin!.id,
            name: admin!.name,
            email: admin!.email,
          },
        });
      }
      case Role.PARTICIPANT: {
        const participant = await this.participantsService.findByEmail(
          dto.email,
        );
        await this.assertPassword(participant?.passwordHash, dto.password);
        return this.issueSession(
          participant!.id,
          participant!.email,
          Role.PARTICIPANT,
          { user: this.toParticipantProfile(participant!) },
        );
      }
      case Role.COACH: {
        const coach = await this.coachesService.findByEmail(dto.email);
        await this.assertPassword(coach?.passwordHash, dto.password);
        return this.issueSession(coach!.id, coach!.email, Role.COACH, {
          user: this.toCoachProfile(coach!),
        });
      }
      case Role.ORGANIZER: {
        const organizer = await this.organizersService.findByEmail(dto.email);
        await this.assertPassword(organizer?.passwordHash, dto.password);
        return this.issueSession(
          organizer!.id,
          organizer!.email,
          Role.ORGANIZER,
          { user: this.toOrganizerProfile(organizer!) },
        );
      }
    }
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

    switch (payload.role) {
      case Role.ADMIN: {
        const admin = await this.adminsService.findById(payload.sub);
        if (!admin) throw new UnauthorizedException('Недійсний refresh-токен');
        return this.issueSession(admin.id, admin.email, Role.ADMIN, {
          admin: { id: admin.id, name: admin.name, email: admin.email },
        });
      }
      case Role.PARTICIPANT: {
        const participant = await this.participantsService.findById(
          payload.sub,
        );
        if (!participant)
          throw new UnauthorizedException('Недійсний refresh-токен');
        return this.issueSession(
          participant.id,
          participant.email,
          Role.PARTICIPANT,
          { user: this.toParticipantProfile(participant) },
        );
      }
      case Role.COACH: {
        const coach = await this.coachesService.findById(payload.sub);
        if (!coach) throw new UnauthorizedException('Недійсний refresh-токен');
        return this.issueSession(coach.id, coach.email, Role.COACH, {
          user: this.toCoachProfile(coach),
        });
      }
      case Role.ORGANIZER: {
        const organizer = await this.organizersService.findById(payload.sub);
        if (!organizer)
          throw new UnauthorizedException('Недійсний refresh-токен');
        return this.issueSession(
          organizer.id,
          organizer.email,
          Role.ORGANIZER,
          { user: this.toOrganizerProfile(organizer) },
        );
      }
    }
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    await this.refreshTokenStore.revoke(payload.sub, payload.jti);
  }

  private async registerAdmin(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.adminsService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Адмін з таким email вже існує');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const admin = await this.adminsService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.issueSession(admin.id, admin.email, Role.ADMIN, {
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  }

  private async registerParticipant(dto: RegisterDto): Promise<AuthResult> {
    await this.assertEmailAndPhoneAvailable(dto.email, dto.phone);
    await this.coachesService.findByIdOrFail(dto.coachId);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const participant = await this.participantsService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      passwordHash,
      birthDate: dto.birthDate,
      coachId: dto.coachId,
    });
    return this.issueSession(
      participant.id,
      participant.email,
      Role.PARTICIPANT,
      { user: this.toParticipantProfile(participant) },
    );
  }

  private async registerCoach(dto: RegisterDto): Promise<AuthResult> {
    await this.assertEmailAndPhoneAvailable(dto.email, dto.phone);
    await this.schoolsService.findByIdOrFail(dto.schoolId);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const coach = await this.coachesService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      passwordHash,
      schoolId: dto.schoolId,
    });
    return this.issueSession(coach.id, coach.email, Role.COACH, {
      user: this.toCoachProfile(coach),
    });
  }

  private async registerOrganizer(dto: RegisterDto): Promise<AuthResult> {
    await this.assertEmailAndPhoneAvailable(dto.email, dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const organizer = await this.organizersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      passwordHash,
    });
    return this.issueSession(organizer.id, organizer.email, Role.ORGANIZER, {
      user: this.toOrganizerProfile(organizer),
    });
  }

  private async assertEmailAndPhoneAvailable(
    email: string,
    phone: string,
  ): Promise<void> {
    const [takenByParticipant, takenByCoach, takenByOrganizer] =
      await Promise.all([
        this.participantsService.existsByEmailOrPhone(email, phone),
        this.coachesService.existsByEmailOrPhone(email, phone),
        this.organizersService.existsByEmailOrPhone(email, phone),
      ]);
    if (takenByParticipant || takenByCoach || takenByOrganizer) {
      throw new ConflictException(EMAIL_OR_PHONE_TAKEN_MESSAGE);
    }
  }

  private async assertPassword(
    passwordHash: string | undefined,
    password: string,
  ): Promise<void> {
    if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  private toParticipantProfile(participant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    birthDate: string;
    coachId: string;
  }) {
    return {
      id: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      email: participant.email,
      birthDate: participant.birthDate,
      coachId: participant.coachId,
    };
  }

  private toCoachProfile(coach: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    schoolId: string;
  }) {
    return {
      id: coach.id,
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.email,
      schoolId: coach.schoolId,
    };
  }

  private toOrganizerProfile(organizer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }) {
    return {
      id: organizer.id,
      firstName: organizer.firstName,
      lastName: organizer.lastName,
      email: organizer.email,
    };
  }

  private async issueSession(
    id: string,
    email: string,
    role: Role,
    profile: Record<string, unknown>,
  ): Promise<AuthResult> {
    const payload: JwtPayload = { sub: id, email, role };
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
    await this.refreshTokenStore.save(id, jti);

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      ...profile,
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
