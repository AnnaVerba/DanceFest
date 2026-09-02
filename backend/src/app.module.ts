import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompetitionsModule } from './competitions/competitions.module';
import { AdminsModule } from './admins/admins.module';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { VenuesModule } from './venues/venues.module';
import { EntriesModule } from './entries/entries.module';
import { NominationsModule } from './nominations/nominations.module';
import { CategoriesModule } from './categories/categories.module';
import { CategoryTemplatesModule } from './category-templates/category-templates.module';
import { PaymentDetailsModule } from './payment-details/payment-details.module';
import { CompetitionRulesModule } from './competition-rules/competition-rules.module';
import { UploadsModule } from './uploads/uploads.module';
import { SchoolsModule } from './schools/schools.module';
import { CoachesModule } from './coaches/coaches.module';
import { ParticipantsModule } from './participants/participants.module';
import { OrganizersModule } from './organizers/organizers.module';
import { CompetitionApplicationsModule } from './competition-applications/competition-applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    AdminsModule,
    AuthModule,
    TeamModule,
    VenuesModule,
    EntriesModule,
    NominationsModule,
    CategoriesModule,
    CategoryTemplatesModule,
    PaymentDetailsModule,
    UploadsModule,
    CompetitionRulesModule,
    SchoolsModule,
    CoachesModule,
    ParticipantsModule,
    OrganizersModule,
    CompetitionApplicationsModule,
  ],
})
export class AppModule {}
