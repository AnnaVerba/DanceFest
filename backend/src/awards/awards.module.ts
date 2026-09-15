import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CategoriesModule } from '../categories/categories.module';
import { CategoryTemplate } from '../category-templates/category-template.model';
import { TemplateNomination } from '../category-templates/template-nomination.model';
import { Entry } from '../entries/entry.model';
import { EntriesModule } from '../entries/entries.module';
import { Nomination } from '../nominations/nomination.model';
import { ScheduleModule } from '../schedule/schedule.module';
import { AwardSettings } from './award-settings.model';
import { AwardsController } from './awards.controller';
import { AwardsService } from './awards.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      AwardSettings,
      Entry,
      Nomination,
      CategoryTemplate,
      TemplateNomination,
    ]),
    EntriesModule,
    ScheduleModule,
    CategoriesModule,
  ],
  controllers: [AwardsController],
  providers: [AwardsService],
})
export class AwardsModule {}
