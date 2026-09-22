import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { Venue } from './venue.model';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [SequelizeModule.forFeature([Competition, Venue, Nomination])],
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}
