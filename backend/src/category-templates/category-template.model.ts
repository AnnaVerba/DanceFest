import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Admin } from '../admins/admin.model';

export interface CategoryTemplateAxis {
  name: string;
  values: string[];
}

@Table({ tableName: 'category_templates' })
export class CategoryTemplate extends Model<CategoryTemplate> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  // Публічні шаблони (isPublic) переживають видалення автора — тому nullable.
  @ForeignKey(() => Admin)
  @Column({ type: DataType.UUID, allowNull: true })
  declare authorId: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isPublic: boolean;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare axes: CategoryTemplateAxis[];

  @BelongsTo(() => Admin)
  declare author: Admin;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
