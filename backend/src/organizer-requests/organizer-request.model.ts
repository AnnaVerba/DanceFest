import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../users/user.model';
import { School } from '../schools/school.model';
import { ApplicationStatus } from '../competition-applications/application-status.enum';

@Table({ tableName: 'organizer_requests' })
export class OrganizerRequest extends Model<OrganizerRequest> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @BelongsTo(() => User, 'userId')
  declare user: User;

  @ForeignKey(() => School)
  @Column({ type: DataType.UUID, allowNull: false })
  declare schoolId: string;

  @BelongsTo(() => School)
  declare school: School;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare note: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(ApplicationStatus)),
    allowNull: false,
    defaultValue: ApplicationStatus.PENDING,
  })
  declare status: ApplicationStatus;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare reviewedByUserId: string | null;

  @BelongsTo(() => User, 'reviewedByUserId')
  declare reviewedBy: User | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare reviewedAt: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare decisionNote: string | null;
}
