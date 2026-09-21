import { useEffect, useState } from 'react';
import { getEntriesQuote } from './entries';
import { QUOTE_KEY_SEPARATOR } from './entriesQuote.constants';
import type { EntriesQuoteState } from './entriesQuote.types';

const IDLE: EntriesQuoteState = { status: 'idle' };
const FAILED: EntriesQuoteState = { status: 'failed' };

interface StoredQuote {
  key: string;
  state: EntriesQuoteState;
}

export function useEntriesQuote(
  competitionId: string | undefined,
  participantIds: string[],
  nominationIds: string[],
): EntriesQuoteState {
  const [stored, setStored] = useState<StoredQuote | null>(null);
  const participantsKey = participantIds.join(QUOTE_KEY_SEPARATOR);
  const nominationsKey = nominationIds.join(QUOTE_KEY_SEPARATOR);
  const requestKey = participantsKey + QUOTE_KEY_SEPARATOR + nominationsKey;

  useEffect(() => {
    if (!competitionId || !participantsKey || !nominationsKey) return;
    let cancelled = false;
    getEntriesQuote(competitionId, {
      participantIds: participantsKey.split(QUOTE_KEY_SEPARATOR),
      nominationIds: nominationsKey.split(QUOTE_KEY_SEPARATOR),
    })
      .then((quote) => {
        if (!cancelled) {
          setStored({ key: requestKey, state: { status: 'ready', ...quote } });
        }
      })
      .catch(() => {
        if (!cancelled) setStored({ key: requestKey, state: FAILED });
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, participantsKey, nominationsKey, requestKey]);

  // A result only counts for the exact selection it was requested for, so a
  // stale quote is never mapped onto a changed selection.
  if (stored?.key === requestKey) return stored.state;
  // Mirrors the effect's own guard: without all three there is no request in
  // flight, so this is a genuine idle, not a pending one.
  if (!competitionId || !participantsKey || !nominationsKey) return IDLE;
  // Same selection change that made the stored result stale has started a
  // new request — carry only its total over, so the sum keeps showing the
  // last known figure instead of blanking out on every tick.
  return {
    status: 'loading',
    total: stored?.state.status === 'ready' ? stored.state.total : null,
  };
}
