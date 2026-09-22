import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Category } from '../categories/category.model';
import { TemplateNomination } from './template-nomination.model';

// Осі номінації шаблону — той самий зв'язок, що й у номінацій конкурсу:
// шаблон породжує номінації один в один, тож і форма даних у них однакова.
@Table({ tableName: 'template_nomination_categories' })
export class TemplateNominationCategory extends Model<TemplateNominationCategory> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => TemplateNomination)
  @Column({ type: DataType.UUID, allowNull: false })
  declare templateNominationId: string;

  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, allowNull: false })
  declare categoryId: string;
}
