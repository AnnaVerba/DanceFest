import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Category } from './category.model';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { NominationsModule } from '../nominations/nominations.module';

@Module({
  imports: [SequelizeModule.forFeature([Category]), NominationsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
