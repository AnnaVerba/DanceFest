import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { Admin } from '../admins/admin.model';
import { CategoriesService } from '../categories/categories.service';
import { AGE_CATEGORY_TYPE } from '../categories/category.model';
import type { Category } from '../categories/category.model';
import {
  CATEGORY_TYPE_LABELS,
  CRITERIA_ORDER,
} from '../categories/category-type-labels';
import { findAgeRangeOverlaps } from '../categories/resolve-age-category';
import { Nomination } from '../nominations/nomination.model';
import {
  AGE_RANGES_OVERLAP_MESSAGE,
  TEMPLATE_IN_USE,
  TEMPLATE_IN_USE_MESSAGE,
} from './template-error-codes';
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
    @InjectModel(Nomination)
    private readonly contestNominationModel: typeof Nomination,
    private readonly categoriesService: CategoriesService,
  ) {}

  async list(requesterId: string, search?: string) {
    const visible = {
      [Op.or]: [{ isPublic: true }, { authorId: requesterId }],
    };
    const trimmed = search?.trim();

    const templates = await this.templateModel.findAll({
      where: trimmed
        ? { [Op.and]: [visible, { name: { [Op.iLike]: `%${trimmed}%` } }] }
        : visible,
      include: AUTHOR_INCLUDE,
      order: [['createdAt', 'DESC']],
    });

    if (templates.length === 0) return [];

    const templateIds = templates.map((t) => t.id);
    const nominations = await this.nominationModel.findAll({
      where: { templateId: { [Op.in]: templateIds } },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
    // Категорії всіх шаблонів вантажаться одним запитом: інакше на списку з
    // тридцяти шаблонів виходить тридцять звернень до бази.
    const categories = await this.loadCategoriesOf(nominations);

    const byTemplate = new Map<string, TemplateNomination[]>();
    for (const nomination of nominations) {
      const bucket = byTemplate.get(nomination.templateId) ?? [];
      bucket.push(nomination);
      byTemplate.set(nomination.templateId, bucket);
    }

    return templates.map((t) => {
      const own = byTemplate.get(t.id) ?? [];
      return {
        ...this.toDto(t),
        nominationsCount: own.length,
        criteria: this.buildCriteria(own, categories),
        specials: this.buildSpecials(own),
      };
    });
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

    const categories = await this.loadCategoriesOf(nominations);

    return {
      ...this.toDto(template),
      nominationsCount: nominations.length,
      criteria: this.buildCriteria(nominations, categories),
      specials: this.buildSpecials(nominations),
      nominations: nominations.map((n) => this.nominationToDto(n)),
    };
  }

  async create(requesterId: string, dto: CreateCategoryTemplateDto) {
    await this.assertCategoriesExist(dto.nominations);
    await this.assertAgeRangesDoNotOverlap(dto.nominations);

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
      await this.assertAgeRangesDoNotOverlap(dto.nominations);
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

    // Копія проходить ту саму перевірку, що й ручне збереження: шаблони,
    // створені до появи перевірки, інакше форкали б перетин далі.
    await this.assertAgeRangesDoNotOverlap(
      sourceNominations.map((n) => ({
        name: n.name,
        categoryIds: n.categoryIds,
      })),
    );

    if (sourceNominations.length > 0) {
      await this.nominationModel.bulkCreate(
        sourceNominations.map((n, index) => ({
          templateId: copy.id,
          name: n.name,
          allowsImprovisation: n.allowsImprovisation,
          categoryIds: n.categoryIds,
          isSpecial: n.isSpecial,
          specialName: n.specialName,
          exitMode: n.exitMode,
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

    const usedBy = await this.contestNominationModel.count({
      where: { templateId },
    });
    if (usedBy > 0) {
      throw new ConflictException({
        code: TEMPLATE_IN_USE,
        message: TEMPLATE_IN_USE_MESSAGE,
        competitionNominationsCount: usedBy,
      });
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
        allowsImprovisation: n.allowsImprovisation ?? false,
        categoryIds: n.categoryIds ?? [],
        isSpecial: n.isSpecial ?? false,
        specialName: n.specialName?.trim() || null,
        exitMode: n.exitMode ?? 'single',
        sortOrder: n.sortOrder ?? index,
      })) as CreationAttributes<TemplateNomination>[],
    );
  }

  /**
   * Перетин діапазонів робить автовизначення вікової категорії неоднозначним:
   * дитина 12 років підпадає і під 9–12, і під 12–15, а переможе та, що
   * трапиться першою. Тому шаблон із перетином не зберігається взагалі.
   */
  private async assertAgeRangesDoNotOverlap(
    nominations: TemplateNominationDto[],
  ): Promise<void> {
    const ids = [...new Set(nominations.flatMap((n) => n.categoryIds ?? []))];
    const categories = await this.categoriesService.findByIds(ids);
    const ageValues = categories.filter((c) => c.type === AGE_CATEGORY_TYPE);

    const overlaps = findAgeRangeOverlaps(ageValues);
    if (overlaps.length > 0) {
      const pairs = overlaps.map(
        ({ first, second }) =>
          `«${first.name}» (${first.ageFrom}–${first.ageTo}) і «${second.name}» (${second.ageFrom}–${second.ageTo})`,
      );
      throw new BadRequestException(
        `${AGE_RANGES_OVERLAP_MESSAGE}: ${pairs.join('; ')}`,
      );
    }
  }

  private async loadCategoriesOf(
    nominations: TemplateNomination[],
  ): Promise<Category[]> {
    const ids = [...new Set(nominations.flatMap((n) => n.categoryIds ?? []))];
    return this.categoriesService.findByIds(ids);
  }

  /**
   * Критерії — це не окрема таблиця, а похідне: категорії, на які посилаються
   * номінації шаблону, згруповані за віссю.
   */
  private buildCriteria(
    nominations: TemplateNomination[],
    categories: Category[],
  ) {
    const used = new Set(nominations.flatMap((n) => n.categoryIds ?? []));
    const mine = categories.filter((c) => used.has(c.id));

    return CRITERIA_ORDER.map((type) => ({
      id: type,
      name: CATEGORY_TYPE_LABELS[type],
      values: mine
        .filter((c) => c.type === type)
        .map((c) => ({
          id: c.id,
          label: c.name,
          ageFrom: c.ageFrom,
          ageTo: c.ageTo,
        })),
    })).filter((criterion) => criterion.values.length > 0);
  }

  private buildSpecials(nominations: TemplateNomination[]) {
    const names = new Set<string>();
    for (const nomination of nominations) {
      if (nomination.isSpecial && nomination.specialName) {
        names.add(nomination.specialName);
      }
    }
    return [...names].map((name) => ({ name }));
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
      allowsImprovisation: nomination.allowsImprovisation,
      categoryIds: nomination.categoryIds,
      isSpecial: nomination.isSpecial,
      specialName: nomination.specialName,
      exitMode: nomination.exitMode,
      sortOrder: nomination.sortOrder,
    };
  }
}
