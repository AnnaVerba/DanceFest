import { Column, DataType, Model, Table } from 'sequelize-typescript';

export const CATEGORY_TYPES = [
  'age',
  'level',
  'direction',
  'style',
  'lineup',
] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

// Єдина вісь, значення якої несуть числові межі.
export const AGE_CATEGORY_TYPE: CategoryType = 'age';

// Вісь, якою заявки на конкурс позначають лігу учасника (Аматорська,
// Професійна тощо) — окремої таблиці для ліг немає, це та сама вісь, що й
// у критеріях номінацій.
export const LEAGUE_CATEGORY_TYPE: CategoryType = 'level';

// Нижня межа вікового діапазону. Нуль — свідомо: у категоріях «до 5» діти
// молодші за рік теж трапляються.
export const MIN_PARTICIPANT_AGE = 0;

// Найменший порядковий номер значення в межах осі.
export const MIN_SORT_ORDER = 0;

@Table({ tableName: 'categories' })
export class Category extends Model<Category> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.ENUM(...CATEGORY_TYPES), allowNull: false })
  declare type: CategoryType;

  // Заповнені лише для типу 'age' — з них сервер визначає вікову категорію
  // учасника за датою народження.
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare ageFrom: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare ageTo: number | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare sortOrder: number;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
