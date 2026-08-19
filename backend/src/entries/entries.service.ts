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
import { Score } from './score.model';
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
    @InjectModel(Score)
    private readonly scoreModel: typeof Score,
    private readonly nominationsService: NominationsService,
  ) {}

  async list(competitionId: string, requesterId: string) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      include: [Score],
      order: [['number', 'ASC']],
    });
    return entries.map((e) => this.toDto(e));
  }

  /**
   * Одна заявка — стільки записів, скільки разів учасник вийде на сцену.
   * Спецкатегорія з окремим виходом на кожну програму дає їх кілька, і кожен
   * іде в програму фестивалю окремим номером зі своєю назвою програми.
   */
  async create(competitionId: string, dto: CreateEntryDto) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    if (!dto.nominationId && !dto.nomination) {
      throw new BadRequestException('Вкажіть номінацію');
    }

    const { nomination, exits, ageCategory, league } =
      await this.nominationsService.resolveForEntry(competitionId, {
        nominationId: dto.nominationId,
        name: dto.nomination,
      });

    // Номер виходу — max + 1, і на кожен вихід свій. Гонка двох одночасних
    // заявок ловиться унікальним індексом (competitionId, number): повторюємо
    // раз, уже з новим max.
    for (let attempt = 0; attempt < 2; attempt++) {
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
    throw new Error('Не вдалося створити заявку');
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

  private toDto(entry: Entry) {
    const scores = entry.scores ?? [];
    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + Number(s.value), 0) / scores.length
        : entry.score === null
          ? null
          : Number(entry.score);

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
      score: averageScore,
      scoresCount: scores.length,
      createdAt: entry.createdAt,
    };
  }
}
