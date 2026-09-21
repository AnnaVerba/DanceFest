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
  return stored?.key === requestKey ? stored.state : IDLE;
}
