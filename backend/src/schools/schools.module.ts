import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { School } from './school.model';
import { User } from '../users/user.model';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';

@Module({
  imports: [SequelizeModule.forFeature([School, User])],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
