import type { useSortable } from '@dnd-kit/sortable';

// What a block's drag handle needs from the sortable block it sits in.
export type SortableHandle = Pick<
  ReturnType<typeof useSortable>,
  'attributes' | 'listeners' | 'setActivatorNodeRef'
>;
