import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../users/user.model';
import { CategoriesModule } from '../categories/categories.module';
import { CategoryTemplate } from './category-template.model';
import { TemplateNomination } from './template-nomination.model';
import { Nomination } from '../nominations/nomination.model';
import { CategoryTemplatesController } from './category-templates.controller';
import { CategoryTemplatesService } from './category-templates.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      CategoryTemplate,
      TemplateNomination,
      Nomination,
    ]),
    CategoriesModule,
  ],
  controllers: [CategoryTemplatesController],
  providers: [CategoryTemplatesService],
})
export class CategoryTemplatesModule {}
