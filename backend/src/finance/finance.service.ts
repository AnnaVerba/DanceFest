import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Entry } from '../entries/entry.model';
import { EntryChargeService } from '../entries/pricing/entry-charge.service';
import type { EntryCharge } from '../entries/pricing/entry-charge';
import { roundMoney } from '../entries/entry-amount';
import { CompetitionsService } from '../competitions/competitions.service';
import { UsersService } from '../users/users.service';
import type { AccessLevel } from '../auth/access-level.enum';
import { resolvePage } from '../common/pagination';
import type { PagedResult } from '../common/pagination';
import { FinanceGroup } from './finance-group.enum';
import { FinanceGroupAccumulator } from './finance-group-accumulator';
import {
  DEFAULT_FINANCE_PAGE_SIZE,
  HEAD_OWN_DANCERS_KEY,
  FINANCE_ENTRY_ATTRIBUTES,
  MAX_FINANCE_PAGE_SIZE,
  UNSPECIFIED_GROUP_KEY,
} from './finance.constants';
import type { FinanceGroupRow, FinanceSummary } from './finance-report.view';
import type { PricedEntry } from './priced-entry.interface';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Entry) private readonly entryModel: typeof Entry,
    private readonly entryChargeService: EntryChargeService,
    private readonly competitionsService: CompetitionsService,
    private readonly usersService: UsersService,
  ) {}

  // The competition total — always the sum of every entry's amount.
  async summary(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<FinanceSummary> {
    const priced = await this.loadPricedEntries(
      competitionId,
      requesterId,
      requesterLevel,
    );
    return {
      entriesCount: priced.length,
      total: priced.reduce((sum, p) => roundMoney(sum + p.amount), 0),
    };
  }

  // One page of what each dancer, trainer or studio owes, optionally
  // narrowed by name. Sums are built over every entry of the competition
  // first, so a search or a page never changes a row's amount.
  async listGroup(
    competitionId: string,
    group: FinanceGroup,
    requesterId: string,
    requesterLevel: AccessLevel,
    rawSearch?: string,
    rawPage?: string,
    rawPageSize?: string,
  ): Promise<PagedResult<FinanceGroupRow>> {
    const priced = await this.loadPricedEntries(
      competitionId,
      requesterId,
      requesterLevel,
    );
    const { page, pageSize, limit, offset } = resolvePage(
      rawPage,
      rawPageSize,
      DEFAULT_FINANCE_PAGE_SIZE,
      MAX_FINANCE_PAGE_SIZE,
    );
    const search = rawSearch?.trim().toLocaleLowerCase() ?? '';
    const rows = (await this.aggregate(group, priced)).filter(
      (row) =>
        !search ||
        [row, ...(row.trainers ?? [])].some(
          (named) => named.name?.toLocaleLowerCase().includes(search) ?? false,
        ),
    );
    return {
      rows: rows.slice(offset, offset + limit),
      total: rows.length,
      page,
      pageSize,
    };
  }

  private async loadPricedEntries(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<PricedEntry[]> {
    await this.competitionsService.loadAndAssertCanEdit(
      competitionId,
      requesterId,
      requesterLevel,
    );
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      attributes: FINANCE_ENTRY_ATTRIBUTES,
      // By createdAt; `id` only breaks ties between entries saved in the
      // same millisecond (bulk apply), so pages never reshuffle.
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const charges = await this.entryChargeService.forCompleteScope(entries);
    return entries.map((entry) => {
      const charge = charges.get(entry.id) as EntryCharge;
      return { entry, amount: charge.amount, charge };
    });
  }

  private async aggregate(
    group: FinanceGroup,
    priced: PricedEntry[],
  ): Promise<FinanceGroupRow[]> {
    const groups = new FinanceGroupAccumulator();
    switch (group) {
      case FinanceGroup.PARTICIPANTS:
        await this.addParticipants(groups, priced);
        break;
      case FinanceGroup.TRAINERS:
        return this.aggregateTrainers(priced);
      case FinanceGroup.STUDIOS:
        for (const { entry, amount } of priced) {
          groups.add(
            entry.studioName ?? UNSPECIFIED_GROUP_KEY,
            entry.studioName,
            amount,
          );
        }
        break;
    }
    return groups.toRows();
  }

  // Per head, with what each of the studio's trainers' dancers owe inside.
  private aggregateTrainers(priced: PricedEntry[]): FinanceGroupRow[] {
    const heads = new FinanceGroupAccumulator();
    const trainersByHead = new Map<string, FinanceGroupAccumulator>();
    const headsWithTrainers = new Set<string>();
    for (const { entry, amount } of priced) {
      const headKey = entry.choreographer ?? UNSPECIFIED_GROUP_KEY;
      heads.add(headKey, entry.choreographer, amount);
      const trainers =
        trainersByHead.get(headKey) ?? new FinanceGroupAccumulator();
      // A head who trains the dancers themself is named as their trainer
      // too; those still count as the head's own dancers.
      const trainerName =
        entry.instructorId === entry.trainerId ? null : entry.instructorName;
      trainers.add(trainerName ?? HEAD_OWN_DANCERS_KEY, trainerName, amount);
      trainersByHead.set(headKey, trainers);
      if (trainerName) headsWithTrainers.add(headKey);
    }
    return heads
      .toRows()
      .map((row) =>
        headsWithTrainers.has(row.key)
          ? { ...row, trainers: trainersByHead.get(row.key)!.toRows() }
          : row,
      );
  }

  // Every dancer is charged their own share of the number (see EntryCharge).
  private async addParticipants(
    groups: FinanceGroupAccumulator,
    priced: PricedEntry[],
  ): Promise<void> {
    const people = await this.usersService.findManyByIds([
      ...new Set(priced.flatMap(({ entry }) => entry.participantIds ?? [])),
    ]);
    const nameById = new Map(
      people.map((p) => [p.id, `${p.lastName} ${p.firstName}`.trim()]),
    );

    for (const { entry, amount, charge } of priced) {
      const participantIds = entry.participantIds ?? [];
      if (participantIds.length === 0) {
        // Added by hand without dancers — the routine name is all we have.
        groups.add(entry.routineName, entry.routineName, amount);
      }
      for (const id of participantIds) {
        // A deleted user no longer owes anything — no row for them.
        const name = nameById.get(id);
        if (name !== undefined) groups.add(id, name, charge.shareOf(id));
      }
    }
  }
}
