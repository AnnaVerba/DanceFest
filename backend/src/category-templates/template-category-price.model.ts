import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Category } from '../categories/category.model';
import { CategoryTemplate } from './category-template.model';

// Ціна одного значення цінової осі («Дуо», «Дебют») у межах одного шаблону —
// помічник заповнення: з неї береться ціна при генерації номінацій. Точна ціна
// живе на самій номінації (TemplateNomination.price).
@Table({ tableName: 'template_category_prices' })
export class TemplateCategoryPrice extends Model<TemplateCategoryPrice> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => CategoryTemplate)
  @Column({ type: DataType.UUID, allowNull: false })
  declare templateId: string;

  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, allowNull: false })
  declare categoryId: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  declare price: number;

  @BelongsTo(() => CategoryTemplate)
  declare template: CategoryTemplate;

  @BelongsTo(() => Category)
  declare category: Category;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
