import { MEDAL_STANDINGS_AWARD_SYSTEM } from './award-system';
import {
  CUPS_PER_GROUP_PERFORMANCE,
  FIRST_PLACE_INDEX,
  PRIZE_PLACES_COUNT,
  SECOND_PLACE_INDEX,
  THIRD_PLACE_INDEX,
} from './awards.constants';
import { distributeAllPlaces, distributeTopPlaces } from './medal-distribution';
import type { AwardPerformance } from './award-performance.interface';
import type { AwardsInput } from './awards-input.interface';
import type {
  AwardsCalculation,
  SpecialAwardSummary,
} from './awards-calculation.interface';

function groupByCategory(
  performances: AwardPerformance[],
): AwardPerformance[][] {
  const byCategory = new Map<string, AwardPerformance[]>();
  for (const performance of performances) {
    const bucket = byCategory.get(performance.categoryKey);
    if (bucket) bucket.push(performance);
    else byCategory.set(performance.categoryKey, [performance]);
  }
  return [...byCategory.values()];
}

// Every exit on stage is its own participation: a dancer who performs in the
// same category several times can place several times, so nothing is merged —
// except in a special nomination, which awards each performer once.
export function calculateAwards(input: AwardsInput): AwardsCalculation {
  const medalStandings = input.awardSystem === MEDAL_STANDINGS_AWARD_SYSTEM;
  const placeMedals = new Array<number>(PRIZE_PLACES_COUNT).fill(0);
  const cups = new Map<string, number>();
  const specials = new Map<string, SpecialAwardSummary>();
  let participationMedals = 0;
  let diplomas = 0;

  for (const category of groupByCategory(input.performances)) {
    const specialName = category[0].specialName;

    if (specialName !== null) {
      const summary = specials.get(specialName) ?? {
        name: specialName,
        winners: 0,
        secondPlaces: 0,
        thirdPlaces: 0,
        participations: 0,
      };
      // One award per performer, however many exits they dance here
      // (Корона: improvisation and a solo): places 1–3, the rest take part.
      const performers = new Set(
        category.map((performance) => performance.performerKey),
      ).size;
      const places = distributeTopPlaces(performers);
      summary.winners += places[FIRST_PLACE_INDEX];
      summary.secondPlaces += places[SECOND_PLACE_INDEX];
      summary.thirdPlaces += places[THIRD_PLACE_INDEX];
      summary.participations +=
        performers - places.reduce((sum, count) => sum + count, 0);
      specials.set(specialName, summary);
      continue;
    }

    for (const performance of category) {
      diplomas += performance.participantsCount;
    }

    const groups = category.filter((p) => p.isGroup);
    for (const group of groups) {
      cups.set(
        group.cupLabel,
        (cups.get(group.cupLabel) ?? 0) + CUPS_PER_GROUP_PERFORMANCE,
      );
      participationMedals += group.participantsCount;
    }

    const individuals = category.filter((p) => !p.isGroup);
    if (individuals.length === 0) continue;

    const spreadOverAll = medalStandings || individuals[0].allMedals;
    const places = spreadOverAll
      ? distributeAllPlaces(individuals.length)
      : distributeTopPlaces(individuals.length);
    const medalsPerPerformance = Math.max(
      ...individuals.map((p) => p.participantsCount),
    );
    places.forEach((performancesAtPlace, place) => {
      placeMedals[place] += performancesAtPlace * medalsPerPerformance;
    });
  }

  return {
    performancesInProgram: input.performances.length,
    placeMedals: {
      first: placeMedals[FIRST_PLACE_INDEX],
      second: placeMedals[SECOND_PLACE_INDEX],
      third: placeMedals[THIRD_PLACE_INDEX],
    },
    participationMedals,
    cups: [...cups].map(([label, count]) => ({ label, count })),
    diplomas,
    specials: [...specials.values()],
  };
}
