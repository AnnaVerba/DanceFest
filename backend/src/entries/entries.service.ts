import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Entry } from './entry.model';
import { EntryScore } from './entry-score.model';
import { CreateEntryDto } from './dto/create-entry.dto';

@Injectable()
export class EntriesService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    @InjectModel(EntryScore)
    private readonly entryScoreModel: typeof EntryScore,
  ) {}

  async list(competitionId: string, requesterId: string) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      order: [['number', 'ASC']],
    });
    const aggregates = await this.aggregateScores(entries.map((e) => e.id));
    return entries.map((e) => this.toDto(e, aggregates.get(e.id)));
  }

  // Публічне подання заявки — учасники не мають адмінського токена.
  async create(competitionId: string, dto: CreateEntryDto) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }

    const number = await this.nextEntryNumber(competitionId);
    const entry = await this.entryModel.create({
      competitionId,
      number,
      routineName: dto.routineName.trim(),
      nomination: dto.nomination.trim(),
      participantsCount: dto.participantsCount ?? null,
      studioName: dto.studioName?.trim() || null,
      choreographer: dto.choreographer?.trim() || null,
      city: dto.city?.trim() || null,
      improv: dto.improv ?? false,
      paymentMethod: dto.paymentMethod ?? null,
    } as CreationAttributes<Entry>);

    return this.toDto(entry, undefined);
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
      throw new NotFoundException('Заявку не знайдено');
    }
    await entry.destroy();
  }

  private async nextEntryNumber(competitionId: string): Promise<number> {
    const last = await this.entryModel.findOne({
      where: { competitionId },
      order: [['number', 'DESC']],
    });
    return (last?.number ?? 0) + 1;
  }

  private async aggregateScores(
    entryIds: string[],
  ): Promise<Map<string, { average: number; count: number }>> {
    const result = new Map<string, { average: number; count: number }>();
    if (entryIds.length === 0) return result;

    const scores = await this.entryScoreModel.findAll({
      where: { entryId: { [Op.in]: entryIds } },
    });
    const byEntry = new Map<string, number[]>();
    for (const score of scores) {
      const list = byEntry.get(score.entryId) ?? [];
      list.push(Number(score.value));
      byEntry.set(score.entryId, list);
    }
    for (const [entryId, values] of byEntry) {
      const sum = values.reduce((acc, v) => acc + v, 0);
      result.set(entryId, {
        average: Math.round((sum / values.length) * 10) / 10,
        count: values.length,
      });
    }
    return result;
  }

  /** Переглядати й видаляти заявки може власник або будь-який адмін команди. */
  private async loadCompetitionAndAssertAccess(
    competitionId: string,
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    if (competition.ownerId === requesterId) return competition;

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException('Немає доступу до цього конкурсу');
    }
    return competition;
  }

  private toDto(
    entry: Entry,
    aggregate: { average: number; count: number } | undefined,
  ) {
    return {
      id: entry.id,
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
      score: aggregate?.average ?? null,
      scoresCount: aggregate?.count ?? 0,
      createdAt: entry.createdAt,
    };
  }
}
