import { randomInt } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { CreationAttributes, UniqueConstraintError } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { MailService } from '../mail/mail.service';
import { Judge } from './judge.model';
import { CreateJudgeDto } from './dto/create-judge.dto';
import { JudgeLoginDto } from './dto/judge-login.dto';
import { SALT_ROUNDS } from '../auth/auth.constants';
import {
  TEMP_PASSWORD_LENGTH,
  TEMP_PASSWORD_CHARS,
  JUDGE_EMAIL_TAKEN_MESSAGE,
  JUDGE_NOT_FOUND_MESSAGE,
  INVALID_JUDGE_CREDENTIALS_MESSAGE,
} from './judges.constants';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';

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
    private readonly mailService: MailService,
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
    const competition = await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
    );

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    let judge: Judge;
    try {
      judge = await this.judgeModel.create({
        competitionId,
        venueId: dto.venueId ?? null,
        name: dto.name.trim(),
        email: dto.email.trim(),
        passwordHash,
      } as CreationAttributes<Judge>);
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new ConflictException(JUDGE_EMAIL_TAKEN_MESSAGE);
      }
      throw err;
    }

    const emailSent = await this.mailService.sendJudgeTempPassword({
      to: judge.email,
      judgeName: judge.name,
      competitionName: competition.name,
      tempPassword,
    });

    return { ...this.toDto(judge), tempPassword, emailSent };
  }

  findByEmail(email: string): Promise<Judge | null> {
    return this.judgeModel.findOne({ where: { email: email.trim() } });
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
      throw new NotFoundException(JUDGE_NOT_FOUND_MESSAGE);
    }
    await judge.destroy();
  }

  findById(judgeId: string): Promise<Judge | null> {
    return this.judgeModel.findByPk(judgeId);
  }

  async login(dto: JudgeLoginDto): Promise<Judge> {
    const candidates = await this.judgeModel.findAll({
      where: { email: dto.email.trim() },
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(dto.password, candidate.passwordHash)) {
        return candidate;
      }
    }
    throw new UnauthorizedException(INVALID_JUDGE_CREDENTIALS_MESSAGE);
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

  private toDto(judge: Judge) {
    return {
      id: judge.id,
      name: judge.name,
      email: judge.email,
      venueId: judge.venueId,
      addedAt: judge.createdAt,
    };
  }
}
