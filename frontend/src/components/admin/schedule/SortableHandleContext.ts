import { createContext } from 'react';
import type { SortableHandle } from './sortableHandle.types';

// Hands a SortableBlockBody's drag listeners down to its BlockDragHandle.
export const SortableHandleContext = createContext<SortableHandle | null>(null);
