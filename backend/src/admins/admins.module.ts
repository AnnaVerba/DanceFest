import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Admin } from './admin.model';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';

@Module({
  imports: [SequelizeModule.forFeature([Admin])],
  controllers: [AdminsController],
  providers: [AdminsService],
  exports: [AdminsService],
})
export class AdminsModule {}
