import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Entry } from '../entries/entry.model';
import { Section } from './section.model';
import { SECTION_ITEM_TYPES } from './section-item-type';
import type { SectionItemType } from './section-item-type';

@Table({ tableName: 'section_items' })
export class SectionItem extends Model<SectionItem> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Section)
  @Column({ type: DataType.UUID, allowNull: false })
  declare sectionId: string;

  // Null for an `award` row, and null-on-delete when the referenced entry
  // is cancelled — such a dangling `performance` row is dropped on the next
  // recalculate.
  @ForeignKey(() => Entry)
  @Column({ type: DataType.UUID, allowNull: true })
  declare entryId: string | null;

  @Column({
    type: DataType.ENUM(...SECTION_ITEM_TYPES),
    allowNull: false,
  })
  declare type: SectionItemType;

  // Groups exits of the same nomination inside a section. Null for `award`.
  @Column({ type: DataType.STRING, allowNull: true })
  declare nominationGroupKey: string | null;

  // Text of a manually inserted row (break, gala). Null otherwise.
  @Column({ type: DataType.STRING, allowNull: true })
  declare label: string | null;

  // Display-only label when several nomination groups are merged in the
  // program. Judging and results keep using the source categories.
  @Column({ type: DataType.STRING, allowNull: true })
  declare mergedGroupLabel: string | null;

  // On-stage seconds frozen when the section was built or last
  // recalculated. Null for `award`.
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare durationSeconds: number | null;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare sortOrder: number;

  @BelongsTo(() => Section)
  declare section: Section;

  @BelongsTo(() => Entry)
  declare entry: Entry | null;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
