import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, col, fn, where } from 'sequelize';
import { Category } from './category.model';
import type { CategoryType } from './category.model';
import { CreateCategoryDto } from './dto/create-category.dto';

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
    if (existing) return this.toDto(existing);

    const created = await this.categoryModel.create({
      name: trimmed,
      type: input.type,
      ageFrom: input.ageFrom ?? null,
      ageTo: input.ageTo ?? null,
      sortOrder: input.sortOrder ?? DEFAULT_CATEGORY_SORT_ORDER,
    } as CreationAttributes<Category>);
    return this.toDto(created);
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
