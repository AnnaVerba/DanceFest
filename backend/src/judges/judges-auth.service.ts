import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { Entry } from '../entries/entry.model';
import { Score } from '../entries/score.model';
import { JudgesService } from './judges.service';
import { JudgeLoginDto } from './dto/judge-login.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JudgeJwtPayload } from './judge-jwt-payload.interface';
import { AuthenticatedJudge } from './current-judge.decorator';

@Injectable()
export class JudgesAuthService {
  constructor(
    private readonly judgesService: JudgesService,
    private readonly jwtService: JwtService,
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    @InjectModel(Score)
    private readonly scoreModel: typeof Score,
  ) {}

  async login(dto: JudgeLoginDto) {
    const judge = await this.judgesService.login(dto);
    const payload: JudgeJwtPayload = {
      sub: judge.id,
      competitionId: judge.competitionId,
      type: 'judge',
    };
    const competition = await this.competitionModel.findByPk(
      judge.competitionId,
    );

    return {
      accessToken: this.jwtService.sign(payload),
      judge: {
        id: judge.id,
        name: judge.name,
        email: judge.email,
        competitionId: judge.competitionId,
        competitionName: competition?.name ?? '',
      },
    };
  }

  async me(judge: AuthenticatedJudge) {
    const competition = await this.competitionModel.findByPk(
      judge.competitionId,
    );
    return {
      id: judge.id,
      name: judge.name,
      email: judge.email,
      competitionId: judge.competitionId,
      competitionName: competition?.name ?? '',
    };
  }

  async listEntries(judge: AuthenticatedJudge) {
    const entries = await this.entryModel.findAll({
      where: { competitionId: judge.competitionId },
      include: [Score],
      order: [['number', 'ASC']],
    });
    return entries.map((entry) => {
      const own = entry.scores?.find((s) => s.judgeId === judge.id) ?? null;
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
        score: own === null ? null : Number(own.value),
      };
    });
  }

  async submitScore(
    judge: AuthenticatedJudge,
    entryId: string,
    dto: SubmitScoreDto,
  ) {
    const entry = await this.entryModel.findOne({
      where: { id: entryId, competitionId: judge.competitionId },
    });
    if (!entry) {
      throw new NotFoundException('Заявку не знайдено');
    }

    const existing = await this.scoreModel.findOne({
      where: { entryId, judgeId: judge.id },
    });
    const score = existing
      ? await existing.update({ value: dto.value })
      : await this.scoreModel.create({
          entryId,
          judgeId: judge.id,
          value: dto.value,
        } as CreationAttributes<Score>);

    return { entryId, value: Number(score.value) };
  }
}
