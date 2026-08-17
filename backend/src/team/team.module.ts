import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Admin } from '../admins/admin.model';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from './competition-admin.model';
import { Invitation } from './invitation.model';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Admin,
      Competition,
      CompetitionAdmin,
      Invitation,
    ]),
  ],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
