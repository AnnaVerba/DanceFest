import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { CompetitionsModule } from './competitions/competitions.module';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { JudgesModule } from './judges/judges.module';
import { VenuesModule } from './venues/venues.module';
import { EntriesModule } from './entries/entries.module';
import { TracksModule } from './tracks/tracks.module';
import { MusicExportModule } from './music-export/music-export.module';
import { NominationsModule } from './nominations/nominations.module';
import { CategoriesModule } from './categories/categories.module';
import { CategoryTemplatesModule } from './category-templates/category-templates.module';
import { PaymentDetailsModule } from './payment-details/payment-details.module';
import { CompetitionRulesModule } from './competition-rules/competition-rules.module';
import { MailModule } from './mail/mail.module';
import { SmsModule } from './sms/sms.module';
import { UploadsModule } from './uploads/uploads.module';
import { SchoolsModule } from './schools/schools.module';
import { UsersModule } from './users/users.module';
import { CompetitionParticipantNumbersModule } from './competition-participant-numbers/competition-participant-numbers.module';
import { OrganizerRequestsModule } from './organizer-requests/organizer-requests.module';
import { AppBootstrapModule } from './app-bootstrap/app-bootstrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    MailModule,
    SmsModule,
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadModels: true,
        synchronize: false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),
    CompetitionsModule,
    AuthModule,
    TeamModule,
    JudgesModule,
    VenuesModule,
    EntriesModule,
    TracksModule,
    MusicExportModule,
    NominationsModule,
    CategoriesModule,
    CategoryTemplatesModule,
    PaymentDetailsModule,
    UploadsModule,
    CompetitionRulesModule,
    SchoolsModule,
    UsersModule,
    CompetitionParticipantNumbersModule,
    OrganizerRequestsModule,
    AppBootstrapModule,
  ],
})
export class AppModule {}
