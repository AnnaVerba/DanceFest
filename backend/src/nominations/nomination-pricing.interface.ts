// What an entry needs to know about its nomination to be priced.
// `specialGroupKey` is null for a nomination that is not a named special one:
// it is then charged on its own, without the pay-once rule.
export interface NominationPricing {
  competitionId: string;
  price: number | null;
  specialGroupKey: string | null;
}
