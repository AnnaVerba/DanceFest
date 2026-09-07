import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompetitionParticipantNumber } from './competition-participant-number.model';
import { CompetitionParticipantNumbersService } from './competition-participant-numbers.service';

@Module({
  imports: [SequelizeModule.forFeature([CompetitionParticipantNumber])],
  providers: [CompetitionParticipantNumbersService],
  exports: [CompetitionParticipantNumbersService],
})
export class CompetitionParticipantNumbersModule {}
