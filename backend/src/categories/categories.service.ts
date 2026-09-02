import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, col, fn, where } from 'sequelize';
import { Category } from './category.model';
import { AGE_CATEGORY_TYPE } from './category.model';
import type { CategoryType } from './category.model';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CATEGORY_NOT_FOUND_MESSAGE } from './categories.constants';

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
   * Немає меж — доповнюємо. Межі є й інші — це справжній конфлікт довідника,
   * а не дрібниця: `categories` спільна, і мовчазне перезаписування зсунуло б
   * вікову сітку в чужих конкурсах.
   */
  private async reconcileAgeRange(
    existing: Category,
    input: CreateCategoryDto,
  ): Promise<Category> {
    if (input.type !== AGE_CATEGORY_TYPE) return existing;
    if (input.ageFrom === undefined || input.ageTo === undefined) {
      return existing;
    }

    const hasRange = existing.ageFrom !== null && existing.ageTo !== null;
    if (!hasRange) {
      existing.ageFrom = input.ageFrom;
      existing.ageTo = input.ageTo;
      await existing.save();
      return existing;
    }

    if (existing.ageFrom !== input.ageFrom || existing.ageTo !== input.ageTo) {
      throw new ConflictException(
        `Вікова категорія «${existing.name}» уже існує з межами ` +
          `${existing.ageFrom}–${existing.ageTo}. Змініть назву або приберіть розбіжність.`,
      );
    }
    return existing;
  }

  async findOrCreateMany(input: CreateCategoryDto[]) {
    const created: Awaited<ReturnType<typeof this.findOrCreate>>[] = [];
    for (const category of input) {
      created.push(await this.findOrCreate(category));
    }
    return created;
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
