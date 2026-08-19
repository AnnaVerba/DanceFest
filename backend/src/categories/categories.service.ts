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

  /**
   * Значення осей створюються не по одному в мить набору, а разом перед
   * збереженням набору — інакше кинутий на півдорозі майстер лишає по собі
   * сміття в спільному довіднику. Порядок відповіді збігається з порядком
   * запиту: за ним фронт підміняє свої тимчасові id на справжні.
   */
  async findOrCreateMany(input: { name: string; type: CategoryType }[]) {
    const created: Awaited<ReturnType<typeof this.findOrCreate>>[] = [];
    // Послідовно, а не Promise.all: два однакові значення в одному запиті
    // паралельно пройшли б повз findOne і впали на унікальному індексі.
    for (const category of input) {
      created.push(await this.findOrCreate(category.name, category.type));
    }
    return created;
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
