import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../users/user.model';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from './competition-admin.model';
import { Invitation } from './invitation.model';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      Competition,
      CompetitionAdmin,
      Invitation,
    ]),
  ],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
