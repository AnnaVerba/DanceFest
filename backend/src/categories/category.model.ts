import { Column, DataType, Model, Table } from 'sequelize-typescript';

export const CATEGORY_TYPES = [
  'age',
  'level',
  'direction',
  'discipline',
  'participants_count',
] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

@Table({ tableName: 'categories' })
export class Category extends Model<Category> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.ENUM(...CATEGORY_TYPES), allowNull: false })
  declare type: CategoryType;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
