import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { Category } from '../categories/category.model';
import { NominationCategory } from './nomination-category.model';
import { CATEGORIES_NOT_LOADED_MESSAGE } from './nominations.constants';
import { Venue } from '../venues/venue.model';
import { CategoryTemplate } from '../category-templates/category-template.model';
import { EXIT_MODES, DEFAULT_EXIT_MODE } from './nomination-exits';
import type { ExitMode } from './nomination-exits';

@Table({ tableName: 'nominations' })
export class Nomination extends Model<Nomination> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @ForeignKey(() => Venue)
  @Column({ type: DataType.UUID, allowNull: true })
  declare venueId: string | null;

  // Шаблон, з якого згенерована номінація. За ним видно, чи зайнятий шаблон.
  @ForeignKey(() => CategoryTemplate)
  @Column({ type: DataType.UUID, allowNull: true })
  declare templateId: string | null;

  // Голе ім'я спецномінації без ліги, віку й програми — за ним усі «корони»
  // змагання мають одну ціну й оплачуються один раз.
  @Column({ type: DataType.STRING, allowNull: true })
  declare specialName: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare price: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare allowsImprovisation: boolean;

  @BelongsToMany(() => Category, () => NominationCategory)
  declare categories: Category[];

  /**
   * Осі номінації. Читаються зі зв'язку, тож рядок без завантажених категорій
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

  @Column({
    type: DataType.ENUM(...EXIT_MODES),
    allowNull: false,
    defaultValue: DEFAULT_EXIT_MODE,
  })
  declare exitMode: ExitMode;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare durationLimitSeconds: number | null;

  // True once an admin sets durationLimitSeconds by hand — from then on,
  // league duration changes must skip this nomination instead of overwriting it.
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare durationOverridden: boolean;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare programLimits: Record<string, number>;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Venue)
  declare venue: Venue;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
