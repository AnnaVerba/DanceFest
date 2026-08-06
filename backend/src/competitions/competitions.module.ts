import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { Competition } from './competition.model';

@Module({
  imports: [SequelizeModule.forFeature([Competition])],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
})
export class CompetitionsModule {}
