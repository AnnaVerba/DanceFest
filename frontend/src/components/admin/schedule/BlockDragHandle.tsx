import { useContext } from 'react';
import { SortableHandleContext } from './SortableHandleContext';
import {
  BLOCK_DRAG_HANDLE_LABEL,
  BLOCK_DRAG_HANDLE_TITLE,
} from './sortableBlock.constants';
import styles from './program.module.css';

// The grip a block is dragged by; renders nothing outside a sortable block.
export default function BlockDragHandle() {
  const handle = useContext(SortableHandleContext);
  if (!handle) return null;
  const { attributes, listeners, setActivatorNodeRef } = handle;
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={styles.dragHandle}
      title={BLOCK_DRAG_HANDLE_TITLE}
      {...attributes}
      {...listeners}
    >
      {BLOCK_DRAG_HANDLE_LABEL}
    </button>
  );
}
