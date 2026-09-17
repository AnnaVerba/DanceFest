import {
  CUPS,
  DIPLOMAS,
  FIRST_PLACE_MEDALS,
  PARTICIPATION_MEDALS,
  SECOND_PLACE_MEDALS,
  SPECIAL_PARTICIPATIONS,
  SPECIAL_WINNERS,
  THIRD_PLACE_MEDALS,
} from './award-line-kind';
import type { AwardLineKind } from './award-line-kind';
import { AWARD_LINE_KEY_SEPARATOR } from './awards.constants';
import type { AwardLine } from './award-line.interface';
import type { AwardsCalculation } from './awards-calculation.interface';

function lineOf(
  kind: AwardLineKind,
  calculated: number,
  overrides: Record<string, number>,
  subject: string | null = null,
): AwardLine {
  const key =
    subject === null ? kind : `${kind}${AWARD_LINE_KEY_SEPARATOR}${subject}`;
  return { key, kind, subject, calculated, override: overrides[key] ?? null };
}

// Flattens the calculation into the purchase list the organizer edits.
export function buildAwardLines(
  calculation: AwardsCalculation,
  overrides: Record<string, number>,
): AwardLine[] {
  return [
    lineOf(FIRST_PLACE_MEDALS, calculation.placeMedals.first, overrides),
    lineOf(SECOND_PLACE_MEDALS, calculation.placeMedals.second, overrides),
    lineOf(THIRD_PLACE_MEDALS, calculation.placeMedals.third, overrides),
    lineOf(PARTICIPATION_MEDALS, calculation.participationMedals, overrides),
    ...calculation.cups.map((cup) =>
      lineOf(CUPS, cup.count, overrides, cup.label),
    ),
    lineOf(DIPLOMAS, calculation.diplomas, overrides),
    ...calculation.specials.flatMap((special) => [
      lineOf(SPECIAL_WINNERS, special.winners, overrides, special.name),
      lineOf(
        SPECIAL_PARTICIPATIONS,
        special.participations,
        overrides,
        special.name,
      ),
    ]),
  ];
}
