import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminsModule } from '../admins/admins.module';
import { ParticipantsModule } from '../participants/participants.module';
import { CoachesModule } from '../coaches/coaches.module';
import { OrganizersModule } from '../organizers/organizers.module';
import { SchoolsModule } from '../schools/schools.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RefreshTokenStoreService } from './refresh-token-store.service';


@Module({
  imports: [
    AdminsModule,
    ParticipantsModule,
    CoachesModule,
    OrganizersModule,
    SchoolsModule,
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
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenStoreService],
})
export class AuthModule {}
