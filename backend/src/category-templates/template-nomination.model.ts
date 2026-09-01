import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { CategoryTemplate } from './category-template.model';
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

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare price: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare allowsImprovisation: boolean;

  @Column({
    type: DataType.ARRAY(DataType.UUID),
    allowNull: false,
    defaultValue: [],
  })
  declare categoryIds: string[];

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isSpecial: boolean;

  @Column({
    type: DataType.ENUM('single', 'per_program'),
    allowNull: false,
    defaultValue: 'single',
  })
  declare exitMode: ExitMode;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare sortOrder: number;

  @BelongsTo(() => CategoryTemplate)
  declare template: CategoryTemplate;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
