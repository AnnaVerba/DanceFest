import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Registration } from './registration.model';
import { Person } from './person.model';

@Table({ tableName: 'registration_participants' })
export class RegistrationParticipant extends Model<RegistrationParticipant> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Registration)
  @Column({ type: DataType.UUID, allowNull: false })
  declare registrationId: string;

  @ForeignKey(() => Person)
  @Column({ type: DataType.UUID, allowNull: false })
  declare personId: string;

  @BelongsTo(() => Registration)
  declare registration: Registration;

  @BelongsTo(() => Person)
  declare person: Person;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
