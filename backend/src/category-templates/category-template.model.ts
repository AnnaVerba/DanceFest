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

  @Column(DataType.DATE)
  declare createdAt: Date;
}
