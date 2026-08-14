import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from '../nominations/nomination.model';
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
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    @InjectModel(Score)
    private readonly scoreModel: typeof Score,
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
   * Публічне подання заявки — форма реєстрації учасника, авторизація не
   * потрібна. Номінація має відповідати вже згенерованій для конкурсу.
   */
  async create(competitionId: string, dto: CreateEntryDto) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }

    const nomination = await this.nominationModel.findOne({
      where: { competitionId, name: dto.nomination },
    });
    if (!nomination) {
      throw new BadRequestException(
        'Цю номінацію не знайдено серед номінацій конкурсу',
      );
    }

    // Наступний порядковий номер у межах конкурсу; рідкісний конфлікт від
    // одночасних заявок ловимо один раз повторною спробою.
    for (let attempt = 0; attempt < 2; attempt++) {
      const last = await this.entryModel.findOne({
        where: { competitionId },
        order: [['number', 'DESC']],
      });
      const number = (last?.number ?? 0) + 1;

      try {
        const entry = await this.entryModel.create({
          competitionId,
          number,
          routineName: dto.routineName.trim(),
          nomination: nomination.name,
          participantsCount: dto.participantsCount ?? null,
          studioName: dto.studioName?.trim() || null,
          choreographer: dto.choreographer?.trim() || null,
          city: dto.city?.trim() || null,
          improv: dto.improv ?? false,
          paymentMethod: dto.paymentMethod ?? null,
        } as CreationAttributes<Entry>);
        return this.toDto(entry);
      } catch (err) {
        if (attempt === 0) continue;
        throw err;
      }
    }
    // Недосяжно — цикл або повертає, або кидає виняток на другій ітерації.
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

  private toDto(entry: Entry) {
    // Середнє з оцінок суддів, якщо вони вже є; інакше — застаріле пряме поле.
    const scores = entry.scores ?? [];
    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + Number(s.value), 0) / scores.length
        : entry.score === null
          ? null
          : Number(entry.score);

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
      score: averageScore,
      scoresCount: scores.length,
      createdAt: entry.createdAt,
    };
  }
}
