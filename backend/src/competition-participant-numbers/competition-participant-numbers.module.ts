import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionParticipantNumber } from './competition-participant-number.model';
import { CompetitionParticipantNumbersService } from './competition-participant-numbers.service';

@Module({
  imports: [
    SequelizeModule.forFeature([CompetitionParticipantNumber, Competition]),
  ],
  providers: [CompetitionParticipantNumbersService],
  exports: [CompetitionParticipantNumbersService],
})
export class CompetitionParticipantNumbersModule {}
