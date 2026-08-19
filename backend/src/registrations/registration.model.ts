import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { Person } from './person.model';
import { RegistrationParticipant } from './registration-participant.model';
import { Performance } from './performance.model';

export type RegistrationStatus =
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'cancelled';

@Table({ tableName: 'registrations' })
export class Registration extends Model<Registration> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @ForeignKey(() => Nomination)
  @Column({ type: DataType.UUID, allowNull: false })
  declare nominationId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare routineName: string | null;

  @ForeignKey(() => Person)
  @Column({ type: DataType.UUID, allowNull: true })
  declare coachId: string | null;

  @ForeignKey(() => Person)
  @Column({ type: DataType.UUID, allowNull: true })
  declare submittedByPersonId: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare choreographer: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare studioName: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare city: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare improv: boolean;

  @Column({
    type: DataType.ENUM('draft', 'submitted', 'confirmed', 'cancelled'),
    allowNull: false,
    defaultValue: 'submitted',
  })
  declare status: RegistrationStatus;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Nomination)
  declare nomination: Nomination;

  @BelongsTo(() => Person, 'coachId')
  declare coach: Person | null;

  @BelongsTo(() => Person, 'submittedByPersonId')
  declare submittedBy: Person | null;

  @HasMany(() => RegistrationParticipant)
  declare participants: RegistrationParticipant[];

  @HasMany(() => Performance)
  declare performances: Performance[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
