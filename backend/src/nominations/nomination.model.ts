import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import type { ExitMode } from './nomination-exits';

@Table({ tableName: 'nominations' })
export class Nomination extends Model<Nomination> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare price: number | null;

  // Дозвіл від адміна. Позначку «це імпровізація» ставить учасник у заявці
  // (entries.improv) — це різні речі.
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare allowsImprovisation: boolean;

  @Column({
    type: DataType.ARRAY(DataType.UUID),
    allowNull: false,
    defaultValue: [],
  })
  declare categoryIds: string[];

  // Спецкатегорія — «Кубок», «Корона», батл. Її дисципліни не розходяться по
  // окремих номінаціях, а лишаються в одній.
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isSpecial: boolean;

  @Column({
    type: DataType.ENUM('single', 'per_program'),
    allowNull: false,
    defaultValue: 'single',
  })
  declare exitMode: ExitMode;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare durationLimitSeconds: number | null;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare programLimits: Record<string, number>;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
