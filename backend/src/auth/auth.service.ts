import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminsService } from '../admins/admins.service';
import { Admin } from '../admins/admin.model';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly jwtService: JwtService,
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

  private buildAuthResponse(admin: Admin) {
    const payload: JwtPayload = { sub: admin.id, email: admin.email };
    return {
      accessToken: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    };
  }
}
