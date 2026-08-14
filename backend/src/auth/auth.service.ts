import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminsService } from '../admins/admins.service';
import { Admin } from '../admins/admin.model';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload, RefreshTokenPayload } from './jwt-payload.interface';

const SALT_ROUNDS = 10;
const DEFAULT_REFRESH_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
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

    return this.buildAuthResponse(admin);
  }

  async login(dto: LoginDto) {
    const admin = await this.adminsService.findByEmail(dto.email);
    if (!admin) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    const isMatch = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    return this.buildAuthResponse(admin);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        { secret: this.refreshSecret() },
      );
    } catch {
      throw new UnauthorizedException(
        'Недійсний або прострочений refresh-токен',
      );
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Недійсний refresh-токен');
    }

    const admin = await this.adminsService.findById(payload.sub);
    if (!admin) {
      throw new UnauthorizedException('Недійсний refresh-токен');
    }

    return this.buildAuthResponse(admin);
  }

  private buildAuthResponse(admin: Admin) {
    const payload: JwtPayload = { sub: admin.id, email: admin.email };
    const refreshPayload: RefreshTokenPayload = { ...payload, type: 'refresh' };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(refreshPayload, {
        secret: this.refreshSecret(),
        expiresIn:
          Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) ||
          DEFAULT_REFRESH_EXPIRES_IN_SECONDS,
      }),
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    };
  }

  private refreshSecret(): string {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET не налаштований');
    }
    return secret;
  }
}
