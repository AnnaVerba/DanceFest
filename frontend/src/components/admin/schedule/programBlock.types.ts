import type { SectionItem } from '../../../lib/schedule';

export type ProgramBlock =
  | { kind: 'group'; key: string; label: string; items: SectionItem[] }
  | { kind: 'manual'; item: SectionItem }
  | { kind: 'award'; item: SectionItem };
