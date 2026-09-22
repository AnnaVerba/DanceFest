import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { CategoryTemplate } from './category-template.model';
import { Category } from '../categories/category.model';
import { TemplateNominationCategory } from './template-nomination-category.model';
import { CATEGORIES_NOT_LOADED_MESSAGE } from '../nominations/nominations.constants';
import { EXIT_MODES, DEFAULT_EXIT_MODE } from '../nominations/nomination-exits';
import type { ExitMode } from '../nominations/nomination-exits';

@Table({ tableName: 'template_nominations' })
export class TemplateNomination extends Model<TemplateNomination> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => CategoryTemplate)
  @Column({ type: DataType.UUID, allowNull: false })
  declare templateId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  // Точна ціна номінації — саме вона їде в конкурс. TemplateCategoryPrice
  // лише допомагає її заповнити при генерації; істина тут.
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare price: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare allowsImprovisation: boolean;

  @BelongsToMany(() => Category, () => TemplateNominationCategory)
  declare categories: Category[];

  /**
   * Осі номінації шаблону. Читаються зі зв'язку, тож рядок без завантажених категорій
   * про свої осі нічого не знає — і тоді кидаємо. Порожній масив тут був би
   * тихою підміною: фільтр вирішив би, що обмежень немає.
   */
  get categoryIds(): string[] {
    if (this.categories === undefined) {
      throw new Error(CATEGORIES_NOT_LOADED_MESSAGE);
    }
    return this.categories.map((category) => category.id);
  }

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isSpecial: boolean;

  // Голе ім'я спецкатегорії, без осей і програми. `name` несе повну мітку.
  @Column({ type: DataType.STRING, allowNull: true })
  declare specialName: string | null;

  @Column({
    type: DataType.ENUM(...EXIT_MODES),
    allowNull: false,
    defaultValue: DEFAULT_EXIT_MODE,
  })
  declare exitMode: ExitMode;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare sortOrder: number;

  @BelongsTo(() => CategoryTemplate)
  declare template: CategoryTemplate;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
