import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, col, fn, where } from 'sequelize';
import { Category } from './category.model';
import { AGE_CATEGORY_TYPE } from './category.model';
import type { CategoryType } from './category.model';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  AGE_RANGE_FROM_EXCEEDS_TO_MESSAGE,
  CATEGORY_NOT_FOUND_MESSAGE,
  NOT_AGE_CATEGORY_MESSAGE,
} from './categories.constants';
import { UpdateAgeRangeDto } from './dto/update-age-range.dto';

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

  async findOrCreate(input: CreateCategoryDto) {
    const trimmed = input.name.trim();

    const existing = await this.categoryModel.findOne({
      where: {
        type: input.type,
        [Op.and]: where(
          fn('lower', fn('btrim', col('name'))),
          trimmed.toLowerCase(),
        ),
      },
    });
    if (existing)
      return this.toDto(await this.reconcileAgeRange(existing, input));

    const created = await this.categoryModel.create({
      name: trimmed,
      type: input.type,
      ageFrom: input.ageFrom ?? null,
      ageTo: input.ageTo ?? null,
      sortOrder: input.sortOrder ?? DEFAULT_CATEGORY_SORT_ORDER,
    } as CreationAttributes<Category>);
    return this.toDto(created);
  }

  /**
   * Категорія з такою назвою вже є. Мовчки повернути її, відкинувши прислані
   * межі, не можна: користувач ввів «від» і «до», побачив успіх, а вікова
   * категорія так і лишилась без діапазону — і заявка потім не визначить вік.
   *
   * Межі, введені користувачем, перевизначають наявні: вікові межі мають бути
   * редагованими, а перетин діапазонів дозволений.
   */
  private async reconcileAgeRange(
    existing: Category,
    input: CreateCategoryDto,
  ): Promise<Category> {
    if (input.type !== AGE_CATEGORY_TYPE) return existing;
    if (input.ageFrom === undefined || input.ageTo === undefined) {
      return existing;
    }

    if (existing.ageFrom === input.ageFrom && existing.ageTo === input.ageTo) {
      return existing;
    }

    existing.ageFrom = input.ageFrom;
    existing.ageTo = input.ageTo;
    await existing.save();
    return existing;
  }

  async findOrCreateMany(input: CreateCategoryDto[]) {
    const created: Awaited<ReturnType<typeof this.findOrCreate>>[] = [];
    for (const category of input) {
      created.push(await this.findOrCreate(category));
    }
    return created;
  }

  async updateAgeRange(id: string, dto: UpdateAgeRangeDto) {
    const category = await this.findByIdOrFail(id);
    if (category.type !== AGE_CATEGORY_TYPE) {
      throw new BadRequestException(NOT_AGE_CATEGORY_MESSAGE);
    }
    if (dto.ageFrom > dto.ageTo) {
      throw new BadRequestException(AGE_RANGE_FROM_EXCEEDS_TO_MESSAGE);
    }

    category.ageFrom = dto.ageFrom;
    category.ageTo = dto.ageTo;
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
      ageFrom: category.ageFrom,
      ageTo: category.ageTo,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
    };
  }
}
