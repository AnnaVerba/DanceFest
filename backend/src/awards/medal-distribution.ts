import {
  NO_PERFORMANCES,
  PERFORMANCES_PER_TOP_PLACE,
  PRIZE_PLACES_COUNT,
} from './awards.constants';

// «Медаль кожному» / «медальний залік»: every performance gets a place,
// split as evenly as possible with the surplus on the better places —
// 3 → 1/1/1, 4 → 2/1/1, 5 → 2/2/1, 14 → 5/5/4.
export function distributeAllPlaces(performances: number): number[] {
  const places: number[] = [];
  let remaining = performances;
  for (let placesLeft = PRIZE_PLACES_COUNT; placesLeft > 0; placesLeft -= 1) {
    const count = Math.ceil(remaining / placesLeft);
    places.push(count);
    remaining -= count;
  }
  return places;
}

// Every other league: one performance per prize place, fewer places when
// the category is smaller than three.
export function distributeTopPlaces(performances: number): number[] {
  const places: number[] = [];
  for (let place = 0; place < PRIZE_PLACES_COUNT; place += 1) {
    places.push(
      place < performances ? PERFORMANCES_PER_TOP_PLACE : NO_PERFORMANCES,
    );
  }
  return places;
}
