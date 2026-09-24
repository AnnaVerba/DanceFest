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

// Вісь складу: Соло, Дуо, Тріо, Група. Її значення несуть кількість людей
// у номері — ту саму числову пару, що вік несе для 'age'.
export const LINEUP_CATEGORY_TYPE: CategoryType = 'lineup';

// Осі, значення яких мають числові межі. Пара колонок у них спільна, бо
// форма даних однакова; сенс задає тип рядка.
export const RANGED_CATEGORY_TYPES: CategoryType[] = [
  AGE_CATEGORY_TYPE,
  LINEUP_CATEGORY_TYPE,
];

// Нижня межа вікового діапазону. Нуль — свідомо: у категоріях «до 5» діти
// молодші за рік теж трапляються.
export const MIN_PARTICIPANT_AGE = 0;

// Найменший склад — один танцюрист. Нуль людей на сцені не виходить.
export const MIN_LINEUP_SIZE = 1;

// Спільна нижня межа для валідації DTO: осі мають різні мінімуми, тож тут
// стоїть найменший із них, а точніший поріг перевіряє сервіс за типом.
export const MIN_RANGE_BOUND = MIN_PARTICIPANT_AGE;

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

  // Числові межі значення осі. Для 'age' це вік, з якого сервер визначає
  // вікову категорію учасника за датою народження; для 'lineup' — кількість
  // людей у номері. Для решти осей порожні.
  //
  // rangeTo = null при заповненому rangeFrom означає «без верхньої межі»
  // (Група — троє й більше). Обидві null — межі не задані.
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare rangeFrom: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare rangeTo: number | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare sortOrder: number;

  // Пояснення значення для учасника у формі заявки. Задає лише адмін;
  // null — пояснення немає.
  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
