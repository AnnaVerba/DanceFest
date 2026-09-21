// What SpecialCategoryModal's `onSubmit` reports back.
//
// `failed` exists so a generic creation failure is not mistaken for success:
// the caller has already surfaced its own message, and the modal must keep
// the draft and stay open instead of resetting it away.
export type SpecialSubmitResult =
  | { status: 'created' }
  // A Ukrainian message about the price, shown above the price field.
  | { status: 'priceConflict'; message: string }
  | { status: 'failed' };
