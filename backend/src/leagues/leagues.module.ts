import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { League } from './league.model';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';

@Module({
  imports: [SequelizeModule.forFeature([League])],
  controllers: [LeaguesController],
  providers: [LeaguesService],
  exports: [LeaguesService],
})
export class LeaguesModule {}
