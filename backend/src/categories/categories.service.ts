import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, col, fn, where } from 'sequelize';
import { Category } from './category.model';
import type { CategoryType } from './category.model';

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
        ['name', 'ASC'],
      ],
    });
    return categories.map((c) => this.toDto(c));
  }

  /**
   * Довідник спільний, тому значення не дублюємо: спершу шукаємо наявне за
   * нормалізованою назвою (той самий вираз, що й в унікальному індексі), і
   * лише потім створюємо.
   */
  async findOrCreate(name: string, type: CategoryType) {
    const trimmed = name.trim();

    const existing = await this.categoryModel.findOne({
      where: {
        type,
        [Op.and]: where(
          fn('lower', fn('btrim', col('name'))),
          trimmed.toLowerCase(),
        ),
      },
    });
    if (existing) return this.toDto(existing);

    const created = await this.categoryModel.create({
      name: trimmed,
      type,
    } as CreationAttributes<Category>);
    return this.toDto(created);
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
      createdAt: category.createdAt,
    };
  }
}
