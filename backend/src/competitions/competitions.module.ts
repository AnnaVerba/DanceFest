import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { Competition } from './competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { PaymentDetails } from '../payment-details/payment-details.model';
import { CompetitionRule } from '../competition-rules/competition-rule.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      PaymentDetails,
      CompetitionRule,
    ]),
  ],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
})
export class CompetitionsModule {}
