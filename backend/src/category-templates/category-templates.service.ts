import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { Admin } from '../admins/admin.model';
import { CategoriesService } from '../categories/categories.service';
import { CategoryTemplate } from './category-template.model';
import { TemplateNomination } from './template-nomination.model';
import { CreateCategoryTemplateDto } from './dto/create-category-template.dto';
import { UpdateCategoryTemplateDto } from './dto/update-category-template.dto';
import { ForkCategoryTemplateDto } from './dto/fork-category-template.dto';
import { TemplateNominationDto } from './dto/template-nomination.dto';

const AUTHOR_INCLUDE = [
  { model: Admin, as: 'author', attributes: ['id', 'name'] },
];

@Injectable()
export class CategoryTemplatesService {
  constructor(
    @InjectModel(CategoryTemplate)
    private readonly templateModel: typeof CategoryTemplate,
    @InjectModel(TemplateNomination)
    private readonly nominationModel: typeof TemplateNomination,
    private readonly categoriesService: CategoriesService,
  ) {}

  async list(requesterId: string) {
    const templates = await this.templateModel.findAll({
      where: { [Op.or]: [{ isPublic: true }, { authorId: requesterId }] },
      include: AUTHOR_INCLUDE,
      order: [['createdAt', 'DESC']],
    });

    const counts = await this.countsByTemplate(templates.map((t) => t.id));

    return templates.map((t) => ({
      ...this.toDto(t),
      nominationsCount: counts.get(t.id) ?? 0,
    }));
  }

  async findOne(templateId: string, requesterId: string) {
    const template = await this.loadReadable(templateId, requesterId);
    const nominations = await this.nominationModel.findAll({
      where: { templateId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    return {
      ...this.toDto(template),
      nominationsCount: nominations.length,
      nominations: nominations.map((n) => this.nominationToDto(n)),
    };
  }

  async create(requesterId: string, dto: CreateCategoryTemplateDto) {
    await this.assertCategoriesExist(dto.nominations);

    const template = await this.templateModel.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      isPublic: dto.isPublic ?? false,
      authorId: requesterId,
      forkedFromId: null,
    } as CreationAttributes<CategoryTemplate>);

    await this.replaceNominations(template.id, dto.nominations);
    return this.findOne(template.id, requesterId);
  }

  async update(
    templateId: string,
    requesterId: string,
    dto: UpdateCategoryTemplateDto,
  ) {
    const template = await this.templateModel.findByPk(templateId);
    if (!template) {
      throw new NotFoundException('Шаблон не знайдено');
    }
    if (template.authorId !== requesterId) {
      throw new ForbiddenException(
        'Редагувати шаблон може лише його автор. Створіть власну копію.',
      );
    }

    if (dto.name !== undefined) template.name = dto.name.trim();
    if (dto.description !== undefined) {
      template.description = dto.description?.trim() || null;
    }
    if (dto.isPublic !== undefined) template.isPublic = dto.isPublic;
    await template.save();

    if (dto.nominations) {
      if (dto.nominations.length === 0) {
        throw new BadRequestException('Шаблон не може бути порожнім');
      }
      await this.assertCategoriesExist(dto.nominations);
      await this.replaceNominations(templateId, dto.nominations);
    }

    return this.findOne(templateId, requesterId);
  }

  async fork(
    templateId: string,
    requesterId: string,
    dto: ForkCategoryTemplateDto,
  ) {
    const source = await this.loadReadable(templateId, requesterId);

    const name = dto.name.trim();
    if (name.toLowerCase() === source.name.trim().toLowerCase()) {
      throw new BadRequestException(
        'Назва копії має відрізнятися від назви оригіналу',
      );
    }

    const copy = await this.templateModel.create({
      name,
      description: source.description,
      isPublic: false,
      authorId: requesterId,
      forkedFromId: source.id,
    } as CreationAttributes<CategoryTemplate>);

    const sourceNominations = await this.nominationModel.findAll({
      where: { templateId: source.id },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    if (sourceNominations.length > 0) {
      await this.nominationModel.bulkCreate(
        sourceNominations.map((n, index) => ({
          templateId: copy.id,
          name: n.name,
          price: n.price,
          allowsImprovisation: n.allowsImprovisation,
          categoryIds: n.categoryIds,
          sortOrder: n.sortOrder ?? index,
        })) as CreationAttributes<TemplateNomination>[],
      );
    }

    return this.findOne(copy.id, requesterId);
  }

  async remove(templateId: string, requesterId: string): Promise<void> {
    const template = await this.templateModel.findByPk(templateId);
    if (!template) {
      throw new NotFoundException('Шаблон не знайдено');
    }
    if (template.authorId !== requesterId) {
      throw new ForbiddenException('Видалити шаблон може лише його автор');
    }
    await template.destroy();
  }

  private async loadReadable(templateId: string, requesterId: string) {
    const template = await this.templateModel.findByPk(templateId, {
      include: AUTHOR_INCLUDE,
    });
    if (!template) {
      throw new NotFoundException('Шаблон не знайдено');
    }
    if (!template.isPublic && template.authorId !== requesterId) {
      throw new NotFoundException('Шаблон не знайдено');
    }
    return template;
  }

  private async replaceNominations(
    templateId: string,
    nominations: TemplateNominationDto[],
  ): Promise<void> {
    await this.nominationModel.destroy({ where: { templateId } });
    await this.nominationModel.bulkCreate(
      nominations.map((n, index) => ({
        templateId,
        name: n.name.trim(),
        price: n.price ?? null,
        allowsImprovisation: n.allowsImprovisation ?? false,
        categoryIds: n.categoryIds ?? [],
        sortOrder: n.sortOrder ?? index,
      })) as CreationAttributes<TemplateNomination>[],
    );
  }

  private async assertCategoriesExist(
    nominations: TemplateNominationDto[],
  ): Promise<void> {
    const ids = [...new Set(nominations.flatMap((n) => n.categoryIds ?? []))];
    if (ids.length === 0) return;

    const existing = await this.categoriesService.findExistingIds(ids);
    const missing = ids.filter((id) => !existing.includes(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Невідомі категорії: ${missing.join(', ')}`,
      );
    }
  }

  private async countsByTemplate(
    templateIds: string[],
  ): Promise<Map<string, number>> {
    if (templateIds.length === 0) return new Map();

    const rows = await this.nominationModel.findAll({
      where: { templateId: { [Op.in]: templateIds } },
      attributes: ['templateId'],
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.templateId, (counts.get(row.templateId) ?? 0) + 1);
    }
    return counts;
  }

  private toDto(template: CategoryTemplate) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      isPublic: template.isPublic,
      forkedFromId: template.forkedFromId,
      author: template.author
        ? { id: template.author.id, name: template.author.name }
        : null,
      createdAt: template.createdAt,
    };
  }

  private nominationToDto(nomination: TemplateNomination) {
    return {
      id: nomination.id,
      name: nomination.name,
      price: nomination.price === null ? null : Number(nomination.price),
      allowsImprovisation: nomination.allowsImprovisation,
      categoryIds: nomination.categoryIds,
      sortOrder: nomination.sortOrder,
    };
  }
}
