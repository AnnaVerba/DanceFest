import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { Admin } from '../admins/admin.model';
import { CategoryTemplate } from './category-template.model';
import { CreateCategoryTemplateDto } from './dto/create-category-template.dto';

const AUTHOR_INCLUDE = [{ model: Admin, as: 'author', attributes: ['id', 'name'] }];

@Injectable()
export class CategoryTemplatesService {
  constructor(
    @InjectModel(CategoryTemplate)
    private readonly categoryTemplateModel: typeof CategoryTemplate,
  ) {}

  // Публічні шаблони + власні приватні; чужі приватні шаблони не видно.
  async findAll(requesterId: string) {
    const templates = await this.categoryTemplateModel.findAll({
      where: { [Op.or]: [{ isPublic: true }, { authorId: requesterId }] },
      include: AUTHOR_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    return templates.map((t) => this.toDto(t));
  }

  async create(dto: CreateCategoryTemplateDto, authorId: string) {
    const template = await this.categoryTemplateModel.create({
      authorId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      isPublic: dto.isPublic ?? false,
      axes: dto.axes.map((a) => ({ name: a.name.trim(), values: a.values })),
    } as CreationAttributes<CategoryTemplate>);

    const withAuthor = await this.categoryTemplateModel.findByPk(template.id, {
      include: AUTHOR_INCLUDE,
    });
    return this.toDto(withAuthor!);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    const template = await this.categoryTemplateModel.findByPk(id);
    if (!template) {
      throw new NotFoundException('Шаблон не знайдено');
    }
    if (template.authorId !== requesterId) {
      throw new ForbiddenException('Видалити шаблон може лише його автор');
    }
    await template.destroy();
  }

  private toDto(template: CategoryTemplate) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      isPublic: template.isPublic,
      axes: template.axes,
      author: template.author
        ? { id: template.author.id, name: template.author.name }
        : null,
      createdAt: template.createdAt,
    };
  }
}
