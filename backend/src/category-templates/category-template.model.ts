import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../users/user.model';
import { TemplateNomination } from './template-nomination.model';
import { TemplateCategoryPrice } from './template-category-price.model';

@Table({ tableName: 'category_templates' })
export class CategoryTemplate extends Model<CategoryTemplate> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isPublic: boolean;

  // Ліги (за назвою, як на заявці), у яких медаль за місце отримує кожен
  // номер категорії — Дебют, Перші кроки. Решта ліг нагороджує лише 1–3 місця.
  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: false,
    defaultValue: [],
  })
  declare allMedalLeagues: string[];

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare authorId: string;

  @BelongsTo(() => User, 'authorId')
  declare author: User;

  @ForeignKey(() => CategoryTemplate)
  @Column({ type: DataType.UUID, allowNull: true })
  declare forkedFromId: string | null;

  @HasMany(() => TemplateNomination)
  declare nominations: TemplateNomination[];

  @HasMany(() => TemplateCategoryPrice)
  declare categoryPrices: TemplateCategoryPrice[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
