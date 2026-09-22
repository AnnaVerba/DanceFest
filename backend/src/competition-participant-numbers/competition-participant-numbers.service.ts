import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, QueryTypes, Transaction } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionParticipantNumber } from './competition-participant-number.model';
import { ParticipantNumberLookup } from './participant-number-lookup';
import { FIRST_PARTICIPANT_NUMBER } from './competition-participant-numbers.constants';

@Injectable()
export class CompetitionParticipantNumbersService {
  constructor(
    @InjectModel(CompetitionParticipantNumber)
    private readonly numberModel: typeof CompetitionParticipantNumber,
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
  ) {}

  // Idempotent: a person already numbered in this competition gets the same
  // number back; otherwise MAX(number) + 1 within the competition. Must run
  // inside a transaction that already holds a lock on the competition row
  // (see EntriesService.insertWithRetry) — that lock is what actually
  // serializes concurrent registrations for the same competition, so the
  // reads below can stay plain reads.
  async assignAll(
    competitionId: string,
    personIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    for (const personId of new Set(personIds)) {
      await this.findOrIssue(competitionId, personId, transaction);
    }
  }

  // Group performances draw from the same sequence as dancers, so a group
  // number never equals a dancer's. Same locking contract as assignAll.
  async issueGroupNumbers(
    competitionId: string,
    count: number,
    transaction: Transaction,
  ): Promise<number[]> {
    return this.issueNumbers(competitionId, count, transaction);
  }

  // For readers that must never see a missing number (track file names):
  // issues numbers to anyone still without one — people registered before
  // numbers existed — under the same competition row lock as a new entry,
  // then returns the lookup.
  async loadLookupIssuingMissing(
    competitionId: string,
    personIds: string[],
  ): Promise<ParticipantNumberLookup> {
    await this.numberModel.sequelize!.transaction(
      async (transaction: Transaction) => {
        await this.competitionModel.findByPk(competitionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        await this.assignAll(competitionId, personIds, transaction);
      },
    );
    return this.loadLookup([competitionId], personIds);
  }

  // `personIds`, when given, scopes the load to just those people — so a
  // paged list of entries never pulls every number of the competition.
  async loadLookup(
    competitionIds: string[],
    personIds?: string[],
  ): Promise<ParticipantNumberLookup> {
    if (competitionIds.length === 0 || personIds?.length === 0) {
      return new ParticipantNumberLookup([]);
    }
    const where: Record<string, unknown> = {
      competitionId: { [Op.in]: competitionIds },
    };
    if (personIds) where.personId = { [Op.in]: [...new Set(personIds)] };
    const rows = await this.numberModel.findAll({ where });
    return new ParticipantNumberLookup(rows);
  }

  // The next `count` free numbers: past the highest one taken by either a
  // dancer or a group performance of this competition.
  private async issueNumbers(
    competitionId: string,
    count: number,
    transaction: Transaction,
  ): Promise<number[]> {
    const [row] = await this.numberModel.sequelize!.query<{ max: number }>(
      `SELECT GREATEST(
                COALESCE((SELECT MAX(number) FROM competition_participant_numbers
                           WHERE "competitionId" = :competitionId), 0),
                COALESCE((SELECT MAX("groupNumber") FROM entries
                           WHERE "competitionId" = :competitionId), 0)
              ) AS max`,
      {
        replacements: { competitionId },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    const first = Math.max(row.max + 1, FIRST_PARTICIPANT_NUMBER);
    return Array.from({ length: count }, (_, index) => first + index);
  }

  private async findOrIssue(
    competitionId: string,
    personId: string,
    transaction: Transaction,
  ): Promise<CompetitionParticipantNumber> {
    const existing = await this.numberModel.findOne({
      where: { competitionId, personId },
      transaction,
    });
    if (existing) {
      return existing;
    }

    const [number] = await this.issueNumbers(competitionId, 1, transaction);

    return this.numberModel.create(
      {
        competitionId,
        personId,
        number,
      } as CreationAttributes<CompetitionParticipantNumber>,
      { transaction },
    );
  }
}
