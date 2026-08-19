import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { Registration } from '../registrations/registration.model';
import { RegistrationParticipant } from '../registrations/registration-participant.model';
import { Person } from '../registrations/person.model';
import { Performance } from '../registrations/performance.model';
import { Score } from '../entries/score.model';
import { JudgesService } from './judges.service';
import { JudgeLoginDto } from './dto/judge-login.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JudgeJwtPayload } from './judge-jwt-payload.interface';
import { AuthenticatedJudge } from './current-judge.decorator';

const PERFORMANCE_INCLUDE = [
  {
    model: Registration,
    include: [
      Nomination,
      {
        model: RegistrationParticipant,
        as: 'participants',
        include: [{ model: Person, as: 'person' }],
      },
    ],
  },
  Score,
];

@Injectable()
export class JudgesAuthService {
  constructor(
    private readonly judgesService: JudgesService,
    private readonly jwtService: JwtService,
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(Performance)
    private readonly performanceModel: typeof Performance,
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

  async listPerformances(judge: AuthenticatedJudge) {
    const performances = await this.performanceModel.findAll({
      where: { competitionId: judge.competitionId },
      include: PERFORMANCE_INCLUDE,
      order: [['createdAt', 'ASC']],
    });

    return performances.map((perf, index) => {
      const own = perf.scores?.find((s) => s.judgeId === judge.id) ?? null;
      const registration = perf.registration;
      return {
        id: perf.id,
        number: index + 1,
        routineName: registration?.routineName ?? null,
        nomination: registration?.nomination?.name ?? '',
        round: perf.round,
        studioName: registration?.studioName ?? null,
        choreographer: registration?.choreographer ?? null,
        participants: (registration?.participants ?? [])
          .map((p) => p.person?.name)
          .filter((name): name is string => Boolean(name)),
        score: own === null ? null : Number(own.value),
      };
    });
  }

  async submitScore(
    judge: AuthenticatedJudge,
    performanceId: string,
    dto: SubmitScoreDto,
  ) {
    const performance = await this.performanceModel.findOne({
      where: { id: performanceId, competitionId: judge.competitionId },
    });
    if (!performance) {
      throw new NotFoundException('Виступ не знайдено');
    }

    const existing = await this.scoreModel.findOne({
      where: { performanceId, judgeId: judge.id },
    });
    const score = existing
      ? await existing.update({ value: dto.value })
      : await this.scoreModel.create({
          performanceId,
          judgeId: judge.id,
          value: dto.value,
        } as CreationAttributes<Score>);

    return { performanceId, value: Number(score.value) };
  }
}
