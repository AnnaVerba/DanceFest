import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Coach } from '../coaches/coach.model';

@Table({ tableName: 'schools' })
export class School extends Model<School> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @HasMany(() => Coach)
  declare coaches: Coach[];
}
