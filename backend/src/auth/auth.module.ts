import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '../users/users.module';
import { SchoolsModule } from '../schools/schools.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GlobalJwtAuthGuard } from './global-jwt-auth.guard';
import { SessionStoreService } from './session-store.service';
import { Session } from './session.model';
import { OtpCode } from './otp-code.model';
import { OtpService } from './otp.service';
import { DEFAULT_ACCESS_EXPIRES_IN_SECONDS } from './auth.constants';

@Module({
  imports: [
    SequelizeModule.forFeature([Session, OtpCode]),
    UsersModule,
    SchoolsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            Number(config.get<string>('JWT_EXPIRES_IN_SECONDS')) ||
            DEFAULT_ACCESS_EXPIRES_IN_SECONDS,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    SessionStoreService,
    OtpService,
    { provide: APP_GUARD, useClass: GlobalJwtAuthGuard },
  ],
})
export class AuthModule {}
