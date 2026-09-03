import { Column, DataType, Model, Table } from 'sequelize-typescript';

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
}
