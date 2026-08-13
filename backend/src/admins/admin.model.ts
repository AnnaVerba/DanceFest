import {
  BelongsToMany,
  Column,
  DataType,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';

@Table({ tableName: 'admins' })
export class Admin extends Model<Admin> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare passwordHash: string;

  /** Конкурси, куди адміна запросили (без урахування тих, де він власник). */
  @BelongsToMany(() => Competition, () => CompetitionAdmin)
  declare competitions: Competition[];
}
