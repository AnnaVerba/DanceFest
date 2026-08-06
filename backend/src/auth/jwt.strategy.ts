import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminsService } from '../admins/admins.service';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly adminsService: AdminsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: JwtPayload) {
    const admin = await this.adminsService.findById(payload.sub);
    if (!admin) {
      throw new UnauthorizedException();
    }
    return { id: admin.id, name: admin.name, email: admin.email };
  }
}
