import { useEffect, useMemo } from 'react';
import { EscapeKeyDragCanceller } from './EscapeKeyDragCanceller';
import { StuckDragGuard } from './StuckDragGuard';

// One guard for the whole table: only one block is dragged at a time.
export function useStuckDragGuard(): StuckDragGuard {
  const guard = useMemo(
    () => new StuckDragGuard(window, new EscapeKeyDragCanceller(document)),
    [],
  );
  // A table unmounted mid-drag must not leave listeners on the window.
  useEffect(() => () => guard.end(), [guard]);
  return guard;
}
