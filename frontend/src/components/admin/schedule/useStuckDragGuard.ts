import { useEffect, useState } from 'react';
import { EscapeKeyDragCanceller } from './EscapeKeyDragCanceller';
import { StuckDragGuard } from './StuckDragGuard';

// One guard for the whole table: only one block is dragged at a time. It is
// state, not useMemo: React may drop a memoized value, and a second guard
// would leave the first one's listeners behind.
export function useStuckDragGuard(): StuckDragGuard {
  const [guard] = useState(
    () => new StuckDragGuard(window, new EscapeKeyDragCanceller(document)),
  );
  // A table unmounted mid-drag must not leave listeners on the window.
  useEffect(() => () => guard.end(), [guard]);
  return guard;
}
