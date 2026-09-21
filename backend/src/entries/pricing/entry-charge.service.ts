import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { NominationsService } from '../../nominations/nominations.service';
import { NOMINATION_NOT_IN_COMPETITION_MESSAGE } from '../../nominations/nominations.constants';
import type { NominationPricing } from '../../nominations/nomination-pricing.interface';
import { Entry } from '../entry.model';
import type { ChargeableEntry } from './chargeable-entry.interface';
import {
  CHARGE_ENTRY_ATTRIBUTES,
  QUOTE_ROW_ID_PREFIX,
} from './entry-charge.constants';
import { EntryCharge } from './entry-charge';
import { EntryChargeCalculator } from './entry-charge-calculator';

@Injectable()
export class EntryChargeService {
  constructor(
    @InjectModel(Entry) private readonly entryModel: typeof Entry,
    private readonly nominationsService: NominationsService,
    private readonly calculator: EntryChargeCalculator,
  ) {}

  async forCompleteScope(
    entries: ChargeableEntry[],
  ): Promise<Map<string, EntryCharge>> {
    const pricing = await this.loadPricing(entries);
    return this.calculator.calculate(entries, pricing);
  }

  // A page of a list shows only some of a dancer's entries, but «the first
  // entry of the group» may sit on another page or in another list — so the
  // dancers' other entries are loaded as history.
  async withDancerHistory(entries: Entry[]): Promise<Map<string, EntryCharge>> {
    const participantIds = [
      ...new Set(entries.flatMap((e) => e.participantIds ?? [])),
    ];
    const history =
      participantIds.length === 0
        ? []
        : await this.entryModel.findAll({
            where: {
              participantIds: { [Op.overlap]: participantIds },
              id: { [Op.notIn]: entries.map((e) => e.id) },
            },
            attributes: CHARGE_ENTRY_ATTRIBUTES,
          });
    return this.forCompleteScope([...entries, ...history]);
  }

  // Prices entries that do not exist yet: the dancers' saved entries in this
  // competition come first, then the proposed rows, oldest to newest.
  async quote(
    competitionId: string,
    participantIds: string[],
    nominationIds: string[],
  ): Promise<number[]> {
    const history = await this.entryModel.findAll({
      where: {
        competitionId,
        participantIds: { [Op.overlap]: participantIds },
      },
      attributes: CHARGE_ENTRY_ATTRIBUTES,
    });
    const submittedAt = Date.now();
    const proposed: ChargeableEntry[] = nominationIds.map(
      (nominationId, index) => ({
        id: `${QUOTE_ROW_ID_PREFIX}${index}`,
        createdAt: new Date(submittedAt + index),
        nominationId,
        participantIds,
        participantsCount: participantIds.length,
        extraFee: 0,
      }),
    );

    const all = [...history, ...proposed];
    const pricing = await this.loadPricing(all);
    for (const { nominationId } of proposed) {
      const nominationCompetitionId = pricing.get(
        nominationId as string,
      )?.competitionId;
      if (nominationCompetitionId !== competitionId) {
        throw new BadRequestException(NOMINATION_NOT_IN_COMPETITION_MESSAGE);
      }
    }
    const charges = this.calculator.calculate(all, pricing);
    return proposed.map((p) => (charges.get(p.id) as EntryCharge).amount);
  }

  private async loadPricing(
    entries: ChargeableEntry[],
  ): Promise<Map<string, NominationPricing>> {
    const nominationIds = [
      ...new Set(
        entries
          .map((e) => e.nominationId)
          .filter((id): id is string => id !== null),
      ),
    ];
    return this.nominationsService.findPricingByIds(nominationIds);
  }
}
