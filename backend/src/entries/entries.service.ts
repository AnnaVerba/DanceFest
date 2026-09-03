import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, Transaction } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { NominationsService } from '../nominations/nominations.service';
import type { NominationExit } from '../nominations/nomination-exits';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { CompetitionParticipantNumbersService } from '../competition-participant-numbers/competition-participant-numbers.service';
import { ParticipantNumberLookup } from '../competition-participant-numbers/participant-number-lookup';
import { AccessLevel } from '../auth/access-level.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Entry } from './entry.model';
import { resolveLineup } from './lineup';
import { Score } from './score.model';
import { User } from '../users/user.model';
import { CreateEntryDto } from './dto/create-entry.dto';
import {
  NOMINATION_REQUIRED_MESSAGE,
  ENTRY_NOT_FOUND_MESSAGE,
  ENTRY_CREATE_FAILED_MESSAGE,
  MAX_ENTRY_NUMBER_ASSIGNMENT_ATTEMPTS,
  ROUTINE_NAME_REQUIRED_MESSAGE,
  NOT_OWN_PARTICIPANT_MESSAGE,
} from './entries.constants';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';

interface SubmitterContext {
  participantId: string | null;
  participantIds: string[];
  participantsCount: number | null;
  routineName: string | null;
  studioName: string | null;
  choreographer: string | null;
}

interface PreparedEntry {
  dto: CreateEntryDto;
  submitter: SubmitterContext;
  routineName: string;
  nominationId: string;
  exits: NominationExit[];
  ageCategory: string | null;
  league: string | null;
}

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
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly participantNumbersService: CompetitionParticipantNumbersService,
  ) {}

  async list(competitionId: string, requesterId: string) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      include: [Score],
      order: [['number', 'ASC']],
    });
    const numbers = await this.participantNumbersService.loadLookup([
      competitionId,
    ]);
    return entries.map((e) => this.toDto(e, numbers));
  }

  async count(competitionId: string): Promise<{ count: number }> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const count = await this.entryModel.count({ where: { competitionId } });
    return { count };
  }

  async create(
    competitionId: string,
    dto: CreateEntryDto,
    user: AuthenticatedUser,
  ) {
    return this.createMany(competitionId, [dto], user);
  }

  // One submission, many nominations: each nomination is a separate stage
  // performance, but they are inserted in a single transaction with one
  // running-number sequence — if any row fails, the whole submission rolls
  // back and nothing half-lands.
  async createMany(
    competitionId: string,
    dtos: CreateEntryDto[],
    user: AuthenticatedUser,
  ) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }

    // All reads (validation, participant + nomination resolution) happen
    // before the transaction opens.
    const prepared = await Promise.all(
      dtos.map((dto) => this.prepareEntry(competitionId, dto, user)),
    );

    const created = await this.insertWithRetry(competitionId, prepared);

    // Every dancer entered here is now registered for the competition and
    // gets their per-competition participant number (idempotent, so a
    // repeat submission by the same dancer keeps the number).
    await this.participantNumbersService.assignAll(
      competitionId,
      prepared.flatMap((entry) => entry.submitter.participantIds),
    );
    const numbers = await this.participantNumbersService.loadLookup([
      competitionId,
    ]);
    return created.map((entry) => this.toDto(entry, numbers));
  }

  private async insertWithRetry(
    competitionId: string,
    prepared: PreparedEntry[],
  ): Promise<Entry[]> {
    for (
      let attempt = 0;
      attempt < MAX_ENTRY_NUMBER_ASSIGNMENT_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.entryModel.sequelize!.transaction(
          async (transaction: Transaction) => {
            const last = await this.entryModel.findOne({
              where: { competitionId },
              order: [['number', 'DESC']],
              transaction,
              lock: transaction.LOCK.UPDATE,
            });

            let nextNumber = (last?.number ?? 0) + 1;
            const rows: CreationAttributes<Entry>[] = [];
            for (const entry of prepared) {
              entry.exits.forEach((exit, index) => {
                rows.push(
                  this.buildRow(competitionId, entry, exit, nextNumber + index),
                );
              });
              nextNumber += entry.exits.length;
            }

            return this.entryModel.bulkCreate(rows, { transaction });
          },
        );
      } catch (err) {
        if (attempt === 0) continue;
        throw err;
      }
    }
    throw new Error(ENTRY_CREATE_FAILED_MESSAGE);
  }

  private async prepareEntry(
    competitionId: string,
    dto: CreateEntryDto,
    user: AuthenticatedUser,
  ): Promise<PreparedEntry> {
    if (!dto.nominationId && !dto.nomination) {
      throw new BadRequestException(NOMINATION_REQUIRED_MESSAGE);
    }

    const submitter = await this.resolveSubmitter(dto, user);
    const routineName = dto.routineName?.trim() || submitter.routineName;
    if (!routineName) {
      throw new BadRequestException(ROUTINE_NAME_REQUIRED_MESSAGE);
    }

    const { nomination, exits, ageCategory, league } =
      await this.nominationsService.resolveForEntry(competitionId, {
        nominationId: dto.nominationId,
        name: dto.nomination,
      });

    return {
      dto,
      submitter,
      routineName,
      nominationId: nomination.id,
      exits,
      ageCategory,
      league,
    };
  }

  private buildRow(
    competitionId: string,
    entry: PreparedEntry,
    exit: PreparedEntry['exits'][number],
    number: number,
  ): CreationAttributes<Entry> {
    const { dto, submitter } = entry;
    const participantsCount =
      dto.participantsCount ?? submitter.participantsCount;
    return {
      competitionId,
      nominationId: entry.nominationId,
      participantId: submitter.participantId,
      participantIds: submitter.participantIds,
      number,
      routineName: entry.routineName,
      nomination: exit.label,
      ageCategory: entry.ageCategory,
      league: entry.league,
      program: exit.programName,
      participantsCount,
      lineup: resolveLineup(participantsCount ?? 1),
      studioName: dto.studioName?.trim() || submitter.studioName,
      choreographer: dto.choreographer?.trim() || submitter.choreographer,
      city: dto.city?.trim() || null,
      improv: dto.improv ?? false,
      paymentMethod: dto.paymentMethod ?? null,
      musicName: dto.musicName?.trim() || null,
    } as CreationAttributes<Entry>;
  }

  // Entries the current user is involved in — their own performances and,
  // if they coach, every performance one of their roster dancers is in.
  async listForUser(user: AuthenticatedUser) {
    const ownIds = new Set<string>([user.id]);
    const roster = await this.usersService.listRosterByCoach(user.id);
    roster.forEach((r) => ownIds.add(r.id));
    const ids = [...ownIds];

    const entries = await this.entryModel.findAll({
      where: {
        [Op.or]: [
          { participantIds: { [Op.overlap]: ids } },
          { participantId: { [Op.in]: ids } },
        ],
      },
      include: [Score],
      order: [['createdAt', 'DESC']],
    });

    const competitionIds = [...new Set(entries.map((e) => e.competitionId))];
    const competitions = await this.competitionModel.findAll({
      where: { id: { [Op.in]: competitionIds } },
    });
    const byId = new Map(competitions.map((c) => [c.id, c]));
    const numbers =
      await this.participantNumbersService.loadLookup(competitionIds);

    return entries.map((entry) => {
      const competition = byId.get(entry.competitionId);
      return {
        ...this.toDto(entry, numbers),
        competitionId: entry.competitionId,
        competitionName: competition?.name ?? null,
        competitionDateFrom: competition?.dateFrom ?? null,
      };
    });
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

  // The apply form always sends `participantIds` (one for a solo, many for
  // a group); an ADMIN/ORGANIZER adding an entry by hand may omit them and
  // pass `routineName` directly.
  private async resolveSubmitter(
    dto: CreateEntryDto,
    user: AuthenticatedUser,
  ): Promise<SubmitterContext> {
    const participants = await this.loadSubmitterParticipants(dto, user);
    if (participants.length === 0) {
      return {
        participantId: null,
        participantIds: [],
        participantsCount: null,
        routineName: null,
        studioName: null,
        choreographer: null,
      };
    }

    const [first] = participants;
    const coach = first.coachId
      ? await this.usersService.findById(first.coachId)
      : null;
    const school = coach?.schoolId
      ? await this.schoolsService.findByIdOrFail(coach.schoolId)
      : null;

    return {
      participantId: first.id,
      participantIds: participants.map((p) => p.id),
      participantsCount: participants.length,
      routineName: this.routineNameFor(participants),
      studioName: school?.name ?? null,
      choreographer: coach
        ? `${coach.firstName} ${coach.lastName}`.trim()
        : null,
    };
  }

  private routineNameFor(participants: User[]): string {
    if (participants.length === 1) {
      const [p] = participants;
      return `${p.lastName} ${p.firstName}`.trim();
    }
    return participants.map((p) => p.lastName).join(', ');
  }

  private async loadSubmitterParticipants(
    dto: CreateEntryDto,
    user: AuthenticatedUser,
  ): Promise<User[]> {
    const ids = this.requestedParticipantIds(dto, user);
    if (ids.length === 0) return [];

    const participants = await Promise.all(
      ids.map((participantId) =>
        this.usersService.findByIdOrFail(participantId),
      ),
    );
    if (user.accessLevel === AccessLevel.COACH) {
      for (const participant of participants) {
        // A coach may enter their own roster dancers and themselves.
        const ownRosterDancer = participant.coachId === user.id;
        const isSelf = participant.id === user.id;
        if (!ownRosterDancer && !isSelf) {
          throw new ForbiddenException(NOT_OWN_PARTICIPANT_MESSAGE);
        }
      }
    }
    return participants;
  }

  private requestedParticipantIds(
    dto: CreateEntryDto,
    user: AuthenticatedUser,
  ): string[] {
    if (dto.participantIds && dto.participantIds.length > 0) {
      return [...new Set(dto.participantIds)];
    }
    if (dto.participantId) {
      return [dto.participantId];
    }
    if (user.accessLevel === AccessLevel.PARTICIPANT) {
      return [user.id];
    }
    return [];
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

  private toDto(entry: Entry, numbers: ParticipantNumberLookup) {
    const scores = entry.scores ?? [];
    const participantIds = entry.participantIds ?? [];
    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + Number(s.value), 0) / scores.length
        : entry.score === null
          ? null
          : Number(entry.score);

    return {
      id: entry.id,
      nominationId: entry.nominationId,
      participantId: entry.participantId,
      participantIds,
      // One per dancer, in `participantIds` order.
      participantNumbers: numbers.numbersFor(
        entry.competitionId,
        participantIds,
      ),
      number: entry.number,
      routineName: entry.routineName,
      nomination: entry.nomination,
      ageCategory: entry.ageCategory,
      league: entry.league,
      program: entry.program,
      participantsCount: entry.participantsCount,
      lineup: entry.lineup,
      studioName: entry.studioName,
      choreographer: entry.choreographer,
      city: entry.city,
      improv: entry.improv,
      paymentMethod: entry.paymentMethod,
      musicName: entry.musicName,
      score: averageScore,
      scoresCount: scores.length,
      createdAt: entry.createdAt,
    };
  }
}
