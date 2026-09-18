import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Entry } from '../entries/entry.model';
import { EntriesModule } from '../entries/entries.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { UsersModule } from '../users/users.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Entry]),
    EntriesModule,
    CompetitionsModule,
    UsersModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
