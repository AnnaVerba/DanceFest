import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Category } from '../categories/category.model';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { CompetitionRulesController } from './competition-rules.controller';
import { CompetitionRulesService } from './competition-rules.service';
import { CompetitionRule } from './competition-rule.model';
import { DurationLimit } from './duration-limit.model';
import { OverlimitTariff } from './overlimit-tariff.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Competition,
      CompetitionAdmin,
      CompetitionRule,
      OverlimitTariff,
      DurationLimit,
      Nomination,
      Category,
    ]),
  ],
  controllers: [CompetitionRulesController],
  providers: [CompetitionRulesService],
  exports: [CompetitionRulesService],
})
export class CompetitionRulesModule {}
