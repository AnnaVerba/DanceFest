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

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isPublic: boolean;

  // Категорії-осі шаблону — те саме, що фронтенд генерує на кроці "Категорії"
  // майстра створення конкурсу; декартів добуток значень дає номінації.
  @Column({ type: DataType.JSONB, allowNull: false })
  declare axes: CategoryTemplateAxis[];

  @ForeignKey(() => Admin)
  @Column({ type: DataType.UUID, allowNull: false })
  declare authorId: string;

  @BelongsTo(() => Admin, 'authorId')
  declare author: Admin;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
