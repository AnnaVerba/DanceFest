import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '../users/users.module';
import { SchoolsModule } from '../schools/schools.module';
import { OrganizerRequest } from './organizer-request.model';
import { OrganizerRequestsService } from './organizer-requests.service';
import { OrganizerRequestsController } from './organizer-requests.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([OrganizerRequest]),
    UsersModule,
    SchoolsModule,
  ],
  controllers: [OrganizerRequestsController],
  providers: [OrganizerRequestsService],
})
export class OrganizerRequestsModule {}
