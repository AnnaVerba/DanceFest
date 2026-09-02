import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { CategoryTemplate } from './category-template.model';
import { EXIT_MODES, DEFAULT_EXIT_MODE } from '../nominations/nomination-exits';
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

  // Голе ім'я спецкатегорії, без осей і програми. `name` несе повну мітку.
  @Column({ type: DataType.STRING, allowNull: true })
  declare specialName: string | null;

  @Column({
    type: DataType.ENUM(...EXIT_MODES),
    allowNull: false,
    defaultValue: DEFAULT_EXIT_MODE,
  })
  declare exitMode: ExitMode;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare sortOrder: number;

  @BelongsTo(() => CategoryTemplate)
  declare template: CategoryTemplate;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
