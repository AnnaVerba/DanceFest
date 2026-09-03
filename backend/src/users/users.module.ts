import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SchoolsModule } from '../schools/schools.module';
import { User } from './user.model';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [SequelizeModule.forFeature([User]), SchoolsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
