import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Category } from '../categories/category.model';
import { Nomination } from './nomination.model';

// Осі номінації. Раніше це був масив `uuid[]` у самому рядку номінації: без
// FK, без унікальності й без індексу, тож кожен фільтр за віссю перебирав усі
// номінації конкурсу. Тепер це звичайний зв'язок — пошук по btree-індексу.
@Table({ tableName: 'nomination_categories' })
export class NominationCategory extends Model<NominationCategory> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Nomination)
  @Column({ type: DataType.UUID, allowNull: false })
  declare nominationId: string;

  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, allowNull: false })
  declare categoryId: string;
}
