import { roundMoney } from '../entry-amount';

interface EntryChargeParts {
  price: number;
  dancerCount: number;
  extraFee: number;
  // Everyone named on the entry, and the part of them who pay the price here
  // (someone who already paid for the same special name elsewhere does not).
  participantIds: ReadonlySet<string>;
  payingParticipantIds: ReadonlySet<string>;
  // Headcount typed in by hand beyond the named dancers; they always pay.
  unidentifiedPayers: number;
}

export class EntryCharge {
  constructor(private readonly parts: EntryChargeParts) {}

  get amount(): number {
    const { price, dancerCount, extraFee } = this.parts;
    const payers = Math.min(
      this.parts.payingParticipantIds.size + this.parts.unidentifiedPayers,
      dancerCount,
    );
    return roundMoney(price * payers + extraFee);
  }

  // One dancer's part: the price if they pay it on this entry, plus an equal
  // share of the extra-time fee. A user not named on the entry is priced as a
  // payer — only a dancer who already paid elsewhere gets the price waived.
  shareOf(participantId: string): number {
    const { price, dancerCount, extraFee } = this.parts;
    const waived =
      this.parts.participantIds.has(participantId) &&
      !this.parts.payingParticipantIds.has(participantId);
    return roundMoney((waived ? 0 : price) + extraFee / dancerCount);
  }
}
