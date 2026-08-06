import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Admin } from './admin.model';
import { AdminsService } from './admins.service';

@Module({
  imports: [SequelizeModule.forFeature([Admin])],
  providers: [AdminsService],
  exports: [AdminsService],
})
export class AdminsModule {}
