import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JudgesService } from './judges.service';
import { JudgeJwtPayload } from './judge-jwt-payload.interface';

// Окрема passport-стратегія ('judge-jwt') — судді не адміни, у них інша
// модель і немає доступу до адмінських ендпойнтів. Той самий JWT_SECRET
// не проблема: токен адміна не має type:'judge' і payload.sub не збігається
// з жодним суддею, тож ця стратегія просто відхилить його.
@Injectable()
export class JudgeJwtStrategy extends PassportStrategy(Strategy, 'judge-jwt') {
  constructor(
    config: ConfigService,
    private readonly judgesService: JudgesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: JudgeJwtPayload) {
    if (payload.type !== 'judge') {
      throw new UnauthorizedException();
    }
    const judge = await this.judgesService.findById(payload.sub);
    if (!judge || judge.competitionId !== payload.competitionId) {
      throw new UnauthorizedException();
    }
    return {
      id: judge.id,
      name: judge.name,
      email: judge.email,
      competitionId: judge.competitionId,
    };
  }
}
