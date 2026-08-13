import { randomInt } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Judge } from './judge.model';
import { CreateJudgeDto } from './dto/create-judge.dto';

const SALT_ROUNDS = 10;
const TEMP_PASSWORD_LENGTH = 8;
// Без 0/O/1/I — щоб пароль, продиктований чи переписаний вручну, не плутався.
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTempPassword(): string {
  let password = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)];
  }
  return password;
}

@Injectable()
export class JudgesService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(Judge)
    private readonly judgeModel: typeof Judge,
  ) {}

  async list(competitionId: string, requesterId: string) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const judges = await this.judgeModel.findAll({
      where: { competitionId },
      order: [['createdAt', 'ASC']],
    });
    return judges.map((j) => this.toDto(j));
  }

  async create(
    competitionId: string,
    requesterId: string,
    dto: CreateJudgeDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const judge = await this.judgeModel.create({
      competitionId,
      name: dto.name.trim(),
      email: dto.email.trim(),
      passwordHash,
    } as CreationAttributes<Judge>);

    // Єдине місце, де тимчасовий пароль існує у відкритому вигляді —
    // ця відповідь. Далі в БД лишається тільки bcrypt-хеш.
    return { ...this.toDto(judge), tempPassword };
  }

  async remove(
    competitionId: string,
    judgeId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const judge = await this.judgeModel.findOne({
      where: { id: judgeId, competitionId },
    });
    if (!judge) {
      throw new NotFoundException('Суддю не знайдено');
    }
    await judge.destroy();
  }

  /** Керувати суддями може власник або будь-який адмін, доданий до команди. */
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

  private toDto(judge: Judge) {
    return {
      id: judge.id,
      name: judge.name,
      email: judge.email,
      addedAt: judge.createdAt,
    };
  }
}
