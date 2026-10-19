import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableHandleContext } from './SortableHandleContext';
import {
  BLOCK_DRAGGING_OPACITY,
  BLOCK_DRAGGING_Z_INDEX,
} from './sortableBlock.constants';

interface SortableBlockBodyProps {
  // The block's first item id — what the section's SortableContext lists.
  id: string;
  disabled: boolean;
  children: ReactNode;
}

// One program block (a category with its performances, or a break) as its
// own table body, so the whole block moves as one when dragged.
export default function SortableBlockBody({
  id,
  disabled,
  children,
}: SortableBlockBodyProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? BLOCK_DRAGGING_Z_INDEX : undefined,
    opacity: isDragging ? BLOCK_DRAGGING_OPACITY : undefined,
  };

  return (
    <SortableHandleContext.Provider
      value={{ attributes, listeners, setActivatorNodeRef }}
    >
      <tbody ref={setNodeRef} style={style}>
        {children}
      </tbody>
    </SortableHandleContext.Provider>
  );
}
