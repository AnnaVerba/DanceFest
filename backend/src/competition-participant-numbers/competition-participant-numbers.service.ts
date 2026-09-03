import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  CreationAttributes,
  Op,
  Transaction,
  UniqueConstraintError,
} from 'sequelize';
import { CompetitionParticipantNumber } from './competition-participant-number.model';
import { ParticipantNumberLookup } from './participant-number-lookup';
import {
  FIRST_PARTICIPANT_NUMBER,
  MAX_PARTICIPANT_NUMBER_ASSIGNMENT_ATTEMPTS,
  PARTICIPANT_NUMBER_CONFLICT_MESSAGE,
} from './competition-participant-numbers.constants';

@Injectable()
export class CompetitionParticipantNumbersService {
  constructor(
    @InjectModel(CompetitionParticipantNumber)
    private readonly numberModel: typeof CompetitionParticipantNumber,
  ) {}

  // Idempotent: a person already numbered in this competition gets the same
  // number back; otherwise MAX(number) + 1 within the competition. Runs in a
  // transaction with SELECT ... FOR UPDATE so two parallel registrations do
  // not race for the same number; the unique index is the last line of
  // defence — one retry, then 409.
  async assign(
    competitionId: string,
    personId: string,
  ): Promise<CompetitionParticipantNumber> {
    for (
      let attempt = 0;
      attempt < MAX_PARTICIPANT_NUMBER_ASSIGNMENT_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.numberModel.sequelize!.transaction(
          (transaction: Transaction) =>
            this.findOrIssue(competitionId, personId, transaction),
        );
      } catch (error) {
        if (!(error instanceof UniqueConstraintError)) {
          throw error;
        }
      }
    }
    throw new ConflictException(PARTICIPANT_NUMBER_CONFLICT_MESSAGE);
  }

  // Every person in the list gets a number in the competition; issued one by
  // one so each assignment keeps its own short lock window.
  async assignAll(competitionId: string, personIds: string[]): Promise<void> {
    for (const personId of new Set(personIds)) {
      await this.assign(competitionId, personId);
    }
  }

  async loadLookup(competitionIds: string[]): Promise<ParticipantNumberLookup> {
    if (competitionIds.length === 0) {
      return new ParticipantNumberLookup([]);
    }
    const rows = await this.numberModel.findAll({
      where: { competitionId: { [Op.in]: competitionIds } },
    });
    return new ParticipantNumberLookup(rows);
  }

  private async findOrIssue(
    competitionId: string,
    personId: string,
    transaction: Transaction,
  ): Promise<CompetitionParticipantNumber> {
    const existing = await this.numberModel.findOne({
      where: { competitionId, personId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      return existing;
    }

    const last = await this.numberModel.findOne({
      where: { competitionId },
      order: [['number', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const number = last ? last.number + 1 : FIRST_PARTICIPANT_NUMBER;

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
