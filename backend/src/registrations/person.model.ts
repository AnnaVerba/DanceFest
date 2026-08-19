import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { RegistrationParticipant } from './registration-participant.model';

@Table({ tableName: 'persons' })
export class Person extends Model<Person> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare phone: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare dateOfBirth: string | null;

  @HasMany(() => RegistrationParticipant)
  declare participations: RegistrationParticipant[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
