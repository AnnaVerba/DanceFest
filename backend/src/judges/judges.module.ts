import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Entry } from '../entries/entry.model';
import { EntryScore } from '../entries/entry-score.model';
import { Judge } from './judge.model';
import { JudgesController } from './judges.controller';
import { JudgesService } from './judges.service';
import { JudgesAuthController } from './judges-auth.controller';
import { JudgesAuthService } from './judges-auth.service';
import { JudgeJwtStrategy } from './judge-jwt.strategy';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Judge,
      Entry,
      EntryScore,
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
