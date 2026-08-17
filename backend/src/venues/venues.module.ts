import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Venue } from './venue.model';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [SequelizeModule.forFeature([Competition, CompetitionAdmin, Venue])],
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}
