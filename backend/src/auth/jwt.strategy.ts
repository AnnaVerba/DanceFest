import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminsService } from '../admins/admins.service';
import { ParticipantsService } from '../participants/participants.service';
import { CoachesService } from '../coaches/coaches.service';
import { OrganizersService } from '../organizers/organizers.service';
import { JwtPayload } from './jwt-payload.interface';
import { Role } from './roles.enum';
import { AuthenticatedAdmin } from './current-user.decorator';
import { AuthenticatedUser } from './authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly adminsService: AdminsService,
    private readonly participantsService: ParticipantsService,
    private readonly coachesService: CoachesService,
    private readonly organizersService: OrganizersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<AuthenticatedAdmin | AuthenticatedUser> {
    switch (payload.role) {
      case Role.ADMIN: {
        const admin = await this.adminsService.findById(payload.sub);
        if (!admin) throw new UnauthorizedException();
        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: Role.ADMIN,
        };
      }
      case Role.PARTICIPANT: {
        const participant = await this.participantsService.findById(
          payload.sub,
        );
        if (!participant) throw new UnauthorizedException();
        return {
          id: participant.id,
          role: Role.PARTICIPANT,
          email: participant.email,
          firstName: participant.firstName,
          lastName: participant.lastName,
        };
      }
      case Role.COACH: {
        const coach = await this.coachesService.findById(payload.sub);
        if (!coach) throw new UnauthorizedException();
        return {
          id: coach.id,
          role: Role.COACH,
          email: coach.email,
          firstName: coach.firstName,
          lastName: coach.lastName,
        };
      }
      case Role.ORGANIZER: {
        const organizer = await this.organizersService.findById(payload.sub);
        if (!organizer) throw new UnauthorizedException();
        return {
          id: organizer.id,
          role: Role.ORGANIZER,
          email: organizer.email,
          firstName: organizer.firstName,
          lastName: organizer.lastName,
        };
      }
      default:
        throw new UnauthorizedException();
    }
  }
}
