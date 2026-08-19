import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from '../nominations/nomination.model';
import { Registration } from '../registrations/registration.model';
import { RegistrationParticipant } from '../registrations/registration-participant.model';
import { Person } from '../registrations/person.model';
import { Performance } from '../registrations/performance.model';
import { Score } from '../entries/score.model';
import { Judge } from './judge.model';
import { JudgesController } from './judges.controller';
import { JudgesAuthController } from './judges-auth.controller';
import { JudgesService } from './judges.service';
import { JudgesAuthService } from './judges-auth.service';
import { JudgeJwtStrategy } from './judge-jwt.strategy';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Judge,
      Nomination,
      Registration,
      RegistrationParticipant,
      Person,
      Performance,
      Score,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            Number(config.get<string>('JWT_EXPIRES_IN_SECONDS')) || 86400,
        },
      }),
    }),
  ],
  controllers: [JudgesController, JudgesAuthController],
  providers: [JudgesService, JudgesAuthService, JudgeJwtStrategy],
})
export class JudgesModule {}
