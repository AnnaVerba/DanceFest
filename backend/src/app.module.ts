import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompetitionsModule } from './competitions/competitions.module';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { JudgesModule } from './judges/judges.module';
import { VenuesModule } from './venues/venues.module';
import { EntriesModule } from './entries/entries.module';
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
import { CompetitionApplicationsModule } from './competition-applications/competition-applications.module';
import { OrganizerRequestsModule } from './organizer-requests/organizer-requests.module';
import { AppBootstrapModule } from './app-bootstrap/app-bootstrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    CompetitionsModule,
    AuthModule,
    TeamModule,
    JudgesModule,
    VenuesModule,
    EntriesModule,
    NominationsModule,
    CategoriesModule,
    CategoryTemplatesModule,
    PaymentDetailsModule,
    UploadsModule,
    CompetitionRulesModule,
    SchoolsModule,
    UsersModule,
    CompetitionApplicationsModule,
    OrganizerRequestsModule,
    AppBootstrapModule,
  ],
})
export class AppModule {}
