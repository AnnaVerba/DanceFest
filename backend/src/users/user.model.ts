import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { School } from '../schools/school.model';
import { AccessLevel, ACCESS_LEVELS } from '../auth/access-level.enum';

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  // Null until a roster participant (added by a coach) claims the account.
  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  declare email: string | null;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare phone: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare passwordHash: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare firstName: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare lastName: string;

  // Collected from everyone at registration so any user can also compete.
  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare birthDate: string | null;

  // What this account is allowed to do. A single ladder, not a set.
  @Column({
    type: DataType.ENUM(...ACCESS_LEVELS),
    allowNull: false,
    defaultValue: AccessLevel.PARTICIPANT,
  })
  declare accessLevel: AccessLevel;

  // False for a stub row with no real login yet (roster participant a
  // coach added, or a mentor coach named but not registered).
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare confirmed: boolean;

  // Set once the user reaches COACH level.
  @ForeignKey(() => School)
  @Column({ type: DataType.UUID, allowNull: true })
  declare schoolId: string | null;

  // The coach this user trains under, when they were added to a roster.
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare coachId: string | null;

  @BelongsTo(() => School)
  declare school: School | null;

  @BelongsTo(() => User, 'coachId')
  declare coach: User | null;

  @Column(DataType.DATE)
  declare createdAt: Date;

  @Column(DataType.DATE)
  declare updatedAt: Date;
}
