import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, col, fn, where } from 'sequelize';
import { Category } from './category.model';
import {
  AGE_CATEGORY_TYPE,
  LINEUP_CATEGORY_TYPE,
  MIN_LINEUP_SIZE,
  RANGED_CATEGORY_TYPES,
} from './category.model';
import type { CategoryType } from './category.model';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  AGE_RANGE_FROM_EXCEEDS_TO_MESSAGE,
  CATEGORY_NOT_FOUND_MESSAGE,
  DESCRIPTION_ADMIN_ONLY_MESSAGE,
  LINEUP_SIZE_TOO_SMALL_MESSAGE,
  NOT_AGE_CATEGORY_MESSAGE,
  RANGE_FROM_EXCEEDS_TO_MESSAGE,
} from './categories.constants';
import { UpdateAgeRangeDto } from './dto/update-age-range.dto';
import { UpdateCategoryDescriptionDto } from './dto/update-category-description.dto';
import { normalizeDescription } from './normalize-description';
import { AccessLevel } from '../auth/access-level.enum';

// Reference data (age categories, leagues, styles) is a small curated set;
// the cap only stops an unbounded scan.
const MAX_CATEGORIES = 1000;

export const DEFAULT_CATEGORY_SORT_ORDER = 0;

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,
  ) {}

  async list(type?: CategoryType, query?: string) {
    const conditions: Record<string, unknown> = {};
    if (type) conditions.type = type;
    if (query?.trim()) {
      conditions.name = { [Op.iLike]: `%${query.trim()}%` };
    }

    const categories = await this.categoryModel.findAll({
      where: conditions,
      order: [
        ['type', 'ASC'],
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
      limit: MAX_CATEGORIES,
    });
    return categories.map((c) => this.toDto(c));
  }

  async findOrCreate(input: CreateCategoryDto, accessLevel: AccessLevel) {
    const trimmed = input.name.trim();
    this.assertRangeIsSane(input);
    this.assertMayDescribe(input, accessLevel);

    const existing = await this.categoryModel.findOne({
      where: {
        type: input.type,
        [Op.and]: where(
          fn('lower', fn('btrim', col('name'))),
          trimmed.toLowerCase(),
        ),
      },
    });
    if (existing) {
      const reconciled = await this.reconcileRange(existing, input);
      return this.toDto(await this.reconcileDescription(reconciled, input));
    }

    const created = await this.categoryModel.create({
      name: trimmed,
      type: input.type,
      rangeFrom: input.rangeFrom ?? null,
      rangeTo: input.rangeTo ?? null,
      sortOrder: input.sortOrder ?? DEFAULT_CATEGORY_SORT_ORDER,
      description: normalizeDescription(input.description),
    } as CreationAttributes<Category>);
    return this.toDto(created);
  }

  // Опис спільний для всіх конкурсів, тож задає його лише адмін.
  private assertMayDescribe(
    input: CreateCategoryDto,
    accessLevel: AccessLevel,
  ): void {
    if (input.description === undefined) return;
    if (accessLevel !== AccessLevel.ADMIN) {
      throw new ForbiddenException(DESCRIPTION_ADMIN_ONLY_MESSAGE);
    }
  }

  // Як і з межами: присланий опис — свідомий намір адміна, а не підказка.
  private async reconcileDescription(
    existing: Category,
    input: CreateCategoryDto,
  ): Promise<Category> {
    if (input.description === undefined) return existing;
    const description = normalizeDescription(input.description);
    if (existing.description === description) return existing;

    existing.description = description;
    await existing.save();
    return existing;
  }

  /**
   * Категорія з такою назвою вже є. Мовчки повернути її, відкинувши прислані
   * межі, не можна: користувач ввів «від» і «до», побачив успіх, а вікова
   * категорія так і лишилась без діапазону — і заявка потім не визначить вік.
   *
   * Межі, введені користувачем, перевизначають наявні: вікові межі мають бути
   * редагованими, а перетин діапазонів дозволений.
   */
  /**
   * Межі значення осі приходять разом із назвою. Порожні — довідник лишається
   * як є; задані — записуються, бо користувач бачив поля й свідомо їх заповнив.
   *
   * Для віку потрібні обидві межі: без верхньої вікова категорія нічого не
   * визначає. Для складу верхня може бути null — це «і більше».
   */
  private async reconcileRange(
    existing: Category,
    input: CreateCategoryDto,
  ): Promise<Category> {
    if (!RANGED_CATEGORY_TYPES.includes(input.type)) return existing;
    if (input.rangeFrom === undefined) return existing;
    if (input.type === AGE_CATEGORY_TYPE && input.rangeTo === undefined) {
      return existing;
    }

    const rangeTo = input.rangeTo ?? null;
    if (existing.rangeFrom === input.rangeFrom && existing.rangeTo === rangeTo) {
      return existing;
    }

    existing.rangeFrom = input.rangeFrom;
    existing.rangeTo = rangeTo;
    await existing.save();
    return existing;
  }

  /**
   * Пара колонок спільна для двох осей, а пороги в них різні, тож DTO
   * перевіряє лише спільний мінімум — точніший поріг відомий тут, де є тип.
   */
  private assertRangeIsSane(input: CreateCategoryDto): void {
    if (!RANGED_CATEGORY_TYPES.includes(input.type)) return;
    if (input.rangeFrom === undefined) return;

    if (
      input.type === LINEUP_CATEGORY_TYPE &&
      input.rangeFrom < MIN_LINEUP_SIZE
    ) {
      throw new BadRequestException(LINEUP_SIZE_TOO_SMALL_MESSAGE);
    }
    if (
      input.rangeTo !== undefined &&
      input.rangeTo !== null &&
      input.rangeFrom > input.rangeTo
    ) {
      throw new BadRequestException(RANGE_FROM_EXCEEDS_TO_MESSAGE);
    }
  }

  async findOrCreateMany(input: CreateCategoryDto[], accessLevel: AccessLevel) {
    const created: Awaited<ReturnType<typeof this.findOrCreate>>[] = [];
    for (const category of input) {
      created.push(await this.findOrCreate(category, accessLevel));
    }
    return created;
  }

  async updateDescription(id: string, dto: UpdateCategoryDescriptionDto) {
    const category = await this.findByIdOrFail(id);
    category.description = normalizeDescription(dto.description);
    await category.save();
    return this.toDto(category);
  }

  async updateAgeRange(id: string, dto: UpdateAgeRangeDto) {
    const category = await this.findByIdOrFail(id);
    if (category.type !== AGE_CATEGORY_TYPE) {
      throw new BadRequestException(NOT_AGE_CATEGORY_MESSAGE);
    }
    if (dto.rangeFrom > dto.rangeTo) {
      throw new BadRequestException(AGE_RANGE_FROM_EXCEEDS_TO_MESSAGE);
    }

    category.rangeFrom = dto.rangeFrom;
    category.rangeTo = dto.rangeTo;
    await category.save();
    return this.toDto(category);
  }

  async findByIds(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) return [];
    return this.categoryModel.findAll({
      where: { id: { [Op.in]: ids } },
      order: [
        ['type', 'ASC'],
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
  }

  async findByIdOrFail(id: string): Promise<Category> {
    const category = await this.categoryModel.findByPk(id);
    if (!category) {
      throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
    }
    return category;
  }

  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const found = await this.categoryModel.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id'],
    });
    return found.map((c) => c.id);
  }

  private toDto(category: Category) {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      rangeFrom: category.rangeFrom,
      rangeTo: category.rangeTo,
      sortOrder: category.sortOrder,
      description: category.description,
      createdAt: category.createdAt,
    };
  }
}
