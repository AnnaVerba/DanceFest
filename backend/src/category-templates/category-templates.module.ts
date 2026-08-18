import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CategoryTemplate } from './category-template.model';
import { CategoryTemplatesController } from './category-templates.controller';
import { CategoryTemplatesService } from './category-templates.service';

@Module({
  imports: [SequelizeModule.forFeature([CategoryTemplate])],
  controllers: [CategoryTemplatesController],
  providers: [CategoryTemplatesService],
})
export class CategoryTemplatesModule {}
