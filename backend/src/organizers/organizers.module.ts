import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Organizer } from './organizer.model';
import { OrganizersService } from './organizers.service';

@Module({
  imports: [SequelizeModule.forFeature([Organizer])],
  providers: [OrganizersService],
  exports: [OrganizersService],
})
export class OrganizersModule {}
