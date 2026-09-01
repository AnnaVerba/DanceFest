import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Coach } from '../coaches/coach.model';

@Table({ tableName: 'participants' })
export class Participant extends Model<Participant> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare firstName: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare lastName: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare phone: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare passwordHash: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare birthDate: string;

  @ForeignKey(() => Coach)
  @Column({ type: DataType.UUID, allowNull: false })
  declare coachId: string;

  @BelongsTo(() => Coach)
  declare coach: Coach;
}
