import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { School } from '../schools/school.model';
import { Participant } from '../participants/participant.model';

@Table({ tableName: 'coaches' })
export class Coach extends Model<Coach> {
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

  @ForeignKey(() => School)
  @Column({ type: DataType.UUID, allowNull: false })
  declare schoolId: string;

  @BelongsTo(() => School)
  declare school: School;

  @HasMany(() => Participant)
  declare participants: Participant[];
}
