import type { Category } from '../categories/category.model';
import type { Entry } from '../entries/entry.model';
import { LINEUP_LABELS } from '../entries/lineup';
import { MIN_PARTICIPANTS_PER_ENTRY } from '../entries/entries.constants';
import type { Nomination } from '../nominations/nomination.model';
import { LINEUP_CATEGORY_TYPE } from './awards.constants';
import type { AwardPerformance } from './award-performance.interface';
import { specialNameKey } from './special-name-key';

// Turns a program entry into the calculator's plain shape, looking up its
// nomination, the competition's «медаль кожному» leagues, the template's
// special name and the nomination's lineup category.
export class AwardPerformanceResolver {
  private readonly allMedalLeagues: Set<string>;

  constructor(
    private readonly nominationsById: Map<string, Nomination>,
    allMedalLeagues: string[],
    private readonly specialNamesByKey: Map<string, string>,
    private readonly categoriesById: Map<string, Category>,
  ) {
    this.allMedalLeagues = new Set(allMedalLeagues);
  }

  resolve(entry: Entry): AwardPerformance {
    const nomination = entry.nominationId
      ? this.nominationsById.get(entry.nominationId)
      : undefined;

    return {
      categoryKey: entry.nominationId ?? entry.nomination,
      participantsCount: Math.max(
        entry.participantsCount ?? (entry.participantIds ?? []).length,
        MIN_PARTICIPANTS_PER_ENTRY,
      ),
      isGroup: entry.lineup === LINEUP_LABELS.GROUP,
      cupLabel: this.cupLabelOf(nomination),
      allMedals:
        entry.league !== null && this.allMedalLeagues.has(entry.league.trim()),
      specialName: this.specialNameOf(nomination),
    };
  }

  private specialNameOf(nomination: Nomination | undefined): string | null {
    if (!nomination?.isSpecial) return null;
    const fromTemplate = nomination.templateId
      ? this.specialNamesByKey.get(
          specialNameKey(nomination.templateId, nomination.categoryIds ?? []),
        )
      : undefined;
    return fromTemplate ?? nomination.name;
  }

  private cupLabelOf(nomination: Nomination | undefined): string {
    const lineup = (nomination?.categoryIds ?? [])
      .map((id) => this.categoriesById.get(id))
      .find((category) => category?.type === LINEUP_CATEGORY_TYPE);
    return lineup?.name ?? LINEUP_LABELS.GROUP;
  }
}
