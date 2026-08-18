import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreationAttributes, Op } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { Entry } from '../entries/entry.model';
import { EntryScore } from '../entries/entry-score.model';
import { JudgesService } from './judges.service';
import { JudgeLoginDto } from './dto/judge-login.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JudgeJwtPayload } from './judge-jwt-payload.interface';
import type { AuthenticatedJudge } from './current-judge.decorator';

@Injectable()
export class JudgesAuthService {
  constructor(
    private readonly judgesService: JudgesService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    @InjectModel(EntryScore)
    private readonly entryScoreModel: typeof EntryScore,
  ) {}

  async login(dto: JudgeLoginDto) {
    const judge = await this.judgesService.findByEmail(dto.email);
    if (!judge) {
      throw new UnauthorizedException('Невірний email або пароль');
    }
    const isMatch = await bcrypt.compare(dto.password, judge.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    const competition = await this.competitionModel.findByPk(judge.competitionId);
    if (!competition) {
      throw new UnauthorizedException('Конкурс цього судді більше не існує');
    }

    const payload: JudgeJwtPayload = {
      sub: judge.id,
      competitionId: judge.competitionId,
      type: 'judge',
    };
    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn:
          Number(this.config.get<string>('JWT_EXPIRES_IN_SECONDS')) || 86400,
      }),
      judge: {
        id: judge.id,
        name: judge.name,
        email: judge.email,
        competitionId: judge.competitionId,
        competitionName: competition.name,
      },
    };
  }

  async listEntries(judge: AuthenticatedJudge) {
    const entries = await this.entryModel.findAll({
      where: { competitionId: judge.competitionId },
      order: [['number', 'ASC']],
    });
    const ownScores = await this.entryScoreModel.findAll({
      where: {
        judgeId: judge.id,
        entryId: { [Op.in]: entries.map((e) => e.id) },
      },
    });
    const scoreByEntry = new Map(
      ownScores.map((s) => [s.entryId, Number(s.value)]),
    );

    return entries.map((entry) => ({
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
      score: scoreByEntry.get(entry.id) ?? null,
    }));
  }

  async submitScore(
    judge: AuthenticatedJudge,
    entryId: string,
    dto: SubmitScoreDto,
  ): Promise<void> {
    const entry = await this.entryModel.findOne({
      where: { id: entryId, competitionId: judge.competitionId },
    });
    if (!entry) {
      throw new NotFoundException('Номер не знайдено');
    }

    const [score] = await this.entryScoreModel.findOrCreate({
      where: { entryId, judgeId: judge.id },
      defaults: {
        entryId,
        judgeId: judge.id,
        value: dto.value,
      } as CreationAttributes<EntryScore>,
    });
    if (score.value !== dto.value) {
      await score.update({ value: dto.value });
    }
  }
}
