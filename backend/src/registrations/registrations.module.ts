import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from '../nominations/nomination.model';
import { Person } from './person.model';
import { Registration } from './registration.model';
import { RegistrationParticipant } from './registration-participant.model';
import { Performance } from './performance.model';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      Nomination,
      Person,
      Registration,
      RegistrationParticipant,
      Performance,
    ]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
