import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Transaction } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { NominationsService } from '../nominations/nominations.service';
import { Entry } from './entry.model';
import { CreateEntryDto } from './dto/create-entry.dto';
import {
  NOMINATION_REQUIRED_MESSAGE,
  ENTRY_NOT_FOUND_MESSAGE,
  ENTRY_CREATE_FAILED_MESSAGE,
  MAX_ENTRY_NUMBER_ASSIGNMENT_ATTEMPTS,
} from './entries.constants';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';

@Injectable()
export class EntriesService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    private readonly nominationsService: NominationsService,
  ) {}

  async list(competitionId: string, requesterId: string) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      order: [['number', 'ASC']],
    });
    return entries.map((e) => this.toDto(e));
  }

  async count(competitionId: string): Promise<{ count: number }> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const count = await this.entryModel.count({ where: { competitionId } });
    return { count };
  }

  async create(competitionId: string, dto: CreateEntryDto) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    if (!dto.nominationId && !dto.nomination) {
      throw new BadRequestException(NOMINATION_REQUIRED_MESSAGE);
    }

    const { nomination, exits, ageCategory, league } =
      await this.nominationsService.resolveForEntry(competitionId, {
        nominationId: dto.nominationId,
        name: dto.nomination,
      });

    for (
      let attempt = 0;
      attempt < MAX_ENTRY_NUMBER_ASSIGNMENT_ATTEMPTS;
      attempt++
    ) {
      try {
        const created = await this.entryModel.sequelize!.transaction(
          async (transaction: Transaction) => {
            const last = await this.entryModel.findOne({
              where: { competitionId },
              order: [['number', 'DESC']],
              transaction,
              lock: transaction.LOCK.UPDATE,
            });
            const firstNumber = (last?.number ?? 0) + 1;

            return this.entryModel.bulkCreate(
              exits.map((exit, index) => ({
                competitionId,
                nominationId: nomination.id,
                number: firstNumber + index,
                routineName: dto.routineName.trim(),
                nomination: exit.label,
                ageCategory,
                league,
                program: exit.programName,
                participantsCount: dto.participantsCount ?? null,
                studioName: dto.studioName?.trim() || null,
                choreographer: dto.choreographer?.trim() || null,
                city: dto.city?.trim() || null,
                improv: dto.improv ?? false,
                paymentMethod: dto.paymentMethod ?? null,
              })) as CreationAttributes<Entry>[],
              { transaction },
            );
          },
        );

        return created.map((entry) => this.toDto(entry));
      } catch (err) {
        if (attempt === 0) continue;
        throw err;
      }
    }
    throw new Error(ENTRY_CREATE_FAILED_MESSAGE);
  }

  async remove(
    competitionId: string,
    entryId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const entry = await this.entryModel.findOne({
      where: { id: entryId, competitionId },
    });
    if (!entry) {
      throw new NotFoundException(ENTRY_NOT_FOUND_MESSAGE);
    }
    await entry.destroy();
  }

  private async loadCompetitionAndAssertAccess(
    competitionId: string,
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    if (competition.ownerId === requesterId) return competition;

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException(NO_COMPETITION_ACCESS_MESSAGE);
    }
    return competition;
  }

  private toDto(entry: Entry) {
    return {
      id: entry.id,
      nominationId: entry.nominationId,
      number: entry.number,
      routineName: entry.routineName,
      nomination: entry.nomination,
      ageCategory: entry.ageCategory,
      league: entry.league,
      program: entry.program,
      participantsCount: entry.participantsCount,
      studioName: entry.studioName,
      choreographer: entry.choreographer,
      city: entry.city,
      improv: entry.improv,
      paymentMethod: entry.paymentMethod,
      score: entry.score === null ? null : Number(entry.score),
      createdAt: entry.createdAt,
    };
  }
}
