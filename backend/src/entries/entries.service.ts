import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, Transaction } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { isEligibleForAgeCategory } from '../categories/age-eligibility';
import type { AgeCategoryRange } from '../categories/resolve-age-category';
import { NominationsService } from '../nominations/nominations.service';
import type { NominationExit } from '../nominations/nomination-exits';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { CompetitionParticipantNumbersService } from '../competition-participant-numbers/competition-participant-numbers.service';
import { ScheduleService } from '../schedule/schedule.service';
import { ParticipantNumberLookup } from '../competition-participant-numbers/participant-number-lookup';
import {
  AccessLevel,
  isStudioStaff,
  meetsLevel,
} from '../auth/access-level.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Entry } from './entry.model';
import { isNumberAllocationRace } from './number-allocation-race';
import { normalizeGroupName } from './group-name';
import type { GroupNameCheck } from './group-name-check.interface';
import { isGroupLineup, resolveLineup } from './lineup';
import { dancerCount, roundMoney } from './entry-amount';
import type { EntryCharge } from './pricing/entry-charge';
import { EntryChargeService } from './pricing/entry-charge.service';
import { Score } from './score.model';
import { User } from '../users/user.model';
import { StudioRole } from '../users/studio-role.enum';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import type { EntryParticipant } from './entry-participant.interface';
import type { EntriesStudioOption } from './entries-studio-option.interface';
import type { MyEntriesQueryDto } from './dto/my-entries-query.dto';
import { buildMyEntriesPage } from './my-entries-page';
import {
  ALL_FILTER_VALUE,
  DEFAULT_MY_ENTRIES_PAGE_SIZE,
  DEFAULT_MY_ENTRIES_SORT,
  ISO_DATE_LENGTH,
  MAX_MY_ENTRIES_PAGE_SIZE,
  MY_ENTRIES_SEARCH_MIN_CHARS,
} from './my-entries.constants';
import type { ParticipantAmount } from './participant-amount.interface';
import type { StudioLeaders } from './studio-leaders.interface';
import { UpdateEntryExtraTimeDto } from './dto/update-entry-extra-time.dto';
import { QuoteEntriesDto } from './dto/quote-entries.dto';
import type { EntriesQuote } from './entries-quote.interface';
import { resolvePage, resolveTypeahead } from '../common/pagination';
import { isImprovisationEntry } from '../tracks/is-improvisation-entry';
import {
  AGE_CATEGORY_MISMATCH_MESSAGE,
  NOMINATION_REQUIRED_MESSAGE,
  ENTRY_NOT_FOUND_MESSAGE,
  ENTRY_CREATE_FAILED_MESSAGE,
  MAX_ENTRY_NUMBER_ASSIGNMENT_ATTEMPTS,
  ROUTINE_NAME_REQUIRED_MESSAGE,
  NOT_OWN_PARTICIPANT_MESSAGE,
  DEFAULT_ENTRIES_PAGE_SIZE,
  MAX_ENTRIES_PAGE_SIZE,
  MAX_MY_ENTRIES,
  STUDIO_NAME_COLLATOR_LOCALE,
  COMPETITION_OVER_APPLY_MESSAGE,
  REGISTRATION_CLOSED_APPLY_MESSAGE,
  PARTICIPANT_ALREADY_IN_NOMINATION_MESSAGE,
  GROUP_NAME_TAKEN_MESSAGE,
  NOMINATION_PARTICIPANT_KEY_SEPARATOR,
  ENTRY_STATS_ATTRIBUTES,
  MAX_ENTRY_STATS_ROWS,
  NOMINATION_PROGRAM_MISMATCH_MESSAGE,
  MIN_PARTICIPANTS_PER_ENTRY,
  ASSIGN_STUDIO_TRAINER_FORBIDDEN_MESSAGE,
  TRAINER_NOT_A_COACH_MESSAGE,
  PROGRAM_PLACEMENT_FAILED_MESSAGE,
  QUOTE_PARTICIPANTS_REQUIRED_MESSAGE,
  NO_EXTRA_TIME_SECONDS,
  NO_EXTRA_FEE,
  EXTRA_TIME_ORGANIZER_ONLY_MESSAGE,
} from './entries.constants';
import { isListedOrganizer } from '../competitions/competition-organizers';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';
import { buildEntryStats } from './build-entry-stats';
import type { EntryStats } from './entry-stats.interface';

interface SubmitterContext extends StudioLeaders {
  participantId: string | null;
  participantIds: string[];
  participantsCount: number | null;
  birthDates: (string | null)[];
  routineName: string | null;
}

interface PreparedEntry {
  dto: CreateEntryDto;
  submitter: SubmitterContext;
  submittedByUserId: string;
  routineName: string;
  nominationId: string;
  nominationName: string;
  lineup: string;
  exits: NominationExit[];
  ageCategory: string | null;
  league: string | null;
}

@Injectable()
export class EntriesService {
  private readonly logger = new Logger(EntriesService.name);

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
    private readonly scheduleService: ScheduleService,
    private readonly entryChargeService: EntryChargeService,
  ) {}

  async list(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    rawPage?: string,
    rawPageSize?: string,
    studioId?: string,
  ) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    // Only the competition's own staff (owner, invited co-organizer, admin)
    // read the full entry list; a coach gets their own roster's entries via
    // `/me/entries`, and the logged-out start list lives at `listPublic`.
    const canRead = await this.isCompetitionStaff(
      competition,
      requesterId,
      requesterLevel,
    );
    if (!canRead) {
      throw new ForbiddenException(NO_COMPETITION_ACCESS_MESSAGE);
    }
    const { page, pageSize, limit, offset } = resolvePage(
      rawPage,
      rawPageSize,
      DEFAULT_ENTRIES_PAGE_SIZE,
      MAX_ENTRIES_PAGE_SIZE,
    );
    const { rows, count } = await this.entryModel.findAndCountAll({
      where: { competitionId, ...(studioId ? { studioId } : {}) },
      include: [Score],
      order: [['number', 'ASC']],
      limit,
      offset,
      distinct: true,
    });
    // Only the numbers for the people on this page.
    const personIds = rows.flatMap((e) => e.participantIds ?? []);
    const numbers = await this.participantNumbersService.loadLookup(
      [competitionId],
      personIds,
    );
    const charges = await this.entryChargeService.withDancerHistory(rows);
    return {
      rows: rows.map((e) => ({
        ...this.toDto(e, numbers),
        amount: (charges.get(e.id) as EntryCharge).amount,
      })),
      total: count,
      page,
      pageSize,
      studios: await this.listEntryStudios(competitionId),
    };
  }

  // Every studio the competition's entries are filed under, by name — the
  // studio filter's options, whatever page or studio is shown.
  private async listEntryStudios(
    competitionId: string,
  ): Promise<EntriesStudioOption[]> {
    const rows = await this.entryModel.findAll({
      attributes: ['studioId', 'studioName'],
      where: { competitionId, studioId: { [Op.ne]: null } },
      group: ['studioId', 'studioName'],
      raw: true,
    });
    const byId = new Map<string, EntriesStudioOption>();
    for (const row of rows) {
      if (row.studioId && !byId.has(row.studioId)) {
        byId.set(row.studioId, { id: row.studioId, name: row.studioName });
      }
    }
    return [...byId.values()].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', STUDIO_NAME_COLLATOR_LOCALE),
    );
  }

  // Public, read-only counterpart to `list`: no login required, no
  // organizer/admin access check, and a limited field set — no payment
  // method, choreographer, studio, city, or the music file itself (its name
  // follows the №_Ім'я_Прізвище_Ліга_Стиль convention and would leak a
  // performer's name).
  async listPublic(
    competitionId: string,
    rawPage?: string,
    rawPageSize?: string,
  ) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const { page, pageSize, limit, offset } = resolvePage(
      rawPage,
      rawPageSize,
      DEFAULT_ENTRIES_PAGE_SIZE,
      MAX_ENTRIES_PAGE_SIZE,
    );
    const { rows, count } = await this.entryModel.findAndCountAll({
      where: { competitionId },
      order: [['number', 'ASC']],
      limit,
      offset,
      distinct: true,
    });
    const personIds = rows.flatMap((e) => e.participantIds ?? []);
    const numbers = await this.participantNumbersService.loadLookup(
      [competitionId],
      personIds,
    );
    return {
      rows: rows.map((e) => this.toPublicDto(e, numbers)),
      total: count,
      page,
      pageSize,
    };
  }

  async count(competitionId: string): Promise<{ count: number }> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const count = await this.entryModel.count({ where: { competitionId } });
    return { count };
  }

  async stats(competitionId: string): Promise<EntryStats> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      attributes: ENTRY_STATS_ATTRIBUTES,
      limit: MAX_ENTRY_STATS_ROWS,
    });
    return buildEntryStats(entries);
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
  // Deadlines are date-only. A day is "passed" once today's UTC date is
  // strictly after it, so the deadline day itself is still open.
  private assertApplicationsOpen(
    competition: Competition,
    user: AuthenticatedUser,
  ): void {
    // A global admin may add entries at any time, deadlines included.
    if (user.accessLevel === AccessLevel.ADMIN) return;
    const today = new Date().toISOString().slice(0, 10);
    if (today > String(competition.dateTo).slice(0, 10)) {
      throw new ForbiddenException(COMPETITION_OVER_APPLY_MESSAGE);
    }
    if (
      today > String(competition.registrationTo).slice(0, 10) &&
      !meetsLevel(user.accessLevel, AccessLevel.ORGANIZER)
    ) {
      throw new ForbiddenException(REGISTRATION_CLOSED_APPLY_MESSAGE);
    }
  }

  async createMany(
    competitionId: string,
    dtos: CreateEntryDto[],
    user: AuthenticatedUser,
  ) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    this.assertApplicationsOpen(competition, user);

    // All reads (validation, participant + nomination resolution) happen
    // before the transaction opens.
    const prepared = await Promise.all(
      dtos.map((dto) => this.prepareEntry(competition, dto, user)),
    );
    this.assertNoRepeatWithinSubmission(prepared);

    const created = await this.insertWithRetry(competitionId, prepared);
    await this.placeInProgram(competitionId, created);

    const numbers = await this.participantNumbersService.loadLookup([
      competitionId,
    ]);
    return created.map((entry) => this.toDto(entry, numbers));
  }

  // A late entry joins its nomination's block if the program already has
  // one. The submission itself must not fail over that — an entry the
  // program could not take simply waits in the unassigned pool.
  private async placeInProgram(
    competitionId: string,
    entries: Entry[],
  ): Promise<void> {
    try {
      await this.scheduleService.appendToScheduledBlocks(
        competitionId,
        entries,
      );
    } catch (err) {
      this.logger.warn(
        `${PROGRAM_PLACEMENT_FAILED_MESSAGE} ${competitionId}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  // One dancer performs in a nomination once per lineup — a soloist may
  // still dance a duo in the same nomination. The several exits of a
  // per-program nomination come from one submitted entry, so they never trip
  // this — only a second entry naming the same dancer does.
  private assertNoRepeatWithinSubmission(prepared: PreparedEntry[]): void {
    const seen = new Set<string>();
    for (const entry of prepared) {
      for (const participantId of entry.submitter.participantIds) {
        const key = [entry.nominationId, entry.lineup, participantId].join(
          NOMINATION_PARTICIPANT_KEY_SEPARATOR,
        );
        if (seen.has(key)) {
          throw this.alreadyInNomination(entry.nominationName);
        }
        seen.add(key);
      }
    }
  }

  // Runs inside the insert transaction, after the competition row lock, so
  // two concurrent submissions cannot both slip the same dancer in.
  private async assertNotAlreadyInNominations(
    competitionId: string,
    prepared: PreparedEntry[],
    transaction: Transaction,
  ): Promise<void> {
    for (const entry of prepared) {
      const clash = await this.hasNominationClash(
        competitionId,
        entry.nominationId,
        entry.lineup,
        entry.submitter.participantIds,
        transaction,
      );
      if (clash) {
        throw this.alreadyInNomination(entry.nominationName);
      }
    }
  }

  // Whether any of these dancers already performs in the nomination with
  // the same lineup — `excludeEntryId` skips the entry being edited.
  private async hasNominationClash(
    competitionId: string,
    nominationId: string,
    lineup: string | null,
    participantIds: string[],
    transaction: Transaction,
    excludeEntryId?: string,
  ): Promise<boolean> {
    if (participantIds.length === 0) return false;
    const existing = await this.entryModel.findOne({
      where: {
        competitionId,
        nominationId,
        lineup,
        participantIds: { [Op.overlap]: participantIds },
        ...(excludeEntryId ? { id: { [Op.ne]: excludeEntryId } } : {}),
      },
      attributes: ['id'],
      transaction,
    });
    return existing !== null;
  }

  // A collective is known by its name, so one name belongs to one group of a
  // competition — letter case and stray spaces do not make a new name. Only a
  // name the applicant typed counts: a group of any size, even a duo, is named
  // on the form, while the others take their dancers' names. One submission
  // may still put the same group into several nominations under its name.
  private async assertGroupNamesAvailable(
    competitionId: string,
    prepared: PreparedEntry[],
    transaction: Transaction,
  ): Promise<void> {
    const groups = prepared.filter((entry) => entry.dto.routineName?.trim());
    if (groups.length === 0) return;

    const usedNames = await this.usedRoutineNames(competitionId, transaction);
    for (const entry of groups) {
      if (usedNames.has(normalizeGroupName(entry.routineName))) {
        throw new ConflictException(
          `${GROUP_NAME_TAKEN_MESSAGE} «${entry.routineName}»`,
        );
      }
    }
  }

  // Every name already used in the competition, in its normalized form.
  private async usedRoutineNames(
    competitionId: string,
    transaction?: Transaction,
  ): Promise<Set<string>> {
    const existing = await this.entryModel.findAll({
      where: { competitionId },
      attributes: ['routineName'],
      transaction,
    });
    return new Set(
      existing.map((entry) => normalizeGroupName(entry.routineName)),
    );
  }

  // The form asks while the name is typed, before anything is submitted:
  // does a group of this competition already carry it?
  async checkGroupName(
    competitionId: string,
    name: string,
  ): Promise<GroupNameCheck> {
    const usedNames = await this.usedRoutineNames(competitionId);
    return { taken: usedNames.has(normalizeGroupName(name)) };
  }

  private alreadyInNomination(nominationName: string): ConflictException {
    return new ConflictException(
      `${PARTICIPANT_ALREADY_IN_NOMINATION_MESSAGE} «${nominationName}»`,
    );
  }

  private async insertWithRetry(
    competitionId: string,
    prepared: PreparedEntry[],
  ): Promise<Entry[]> {
    const participantIds = prepared.flatMap(
      (entry) => entry.submitter.participantIds,
    );

    for (
      let attempt = 0;
      attempt < MAX_ENTRY_NUMBER_ASSIGNMENT_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.entryModel.sequelize!.transaction(
          async (transaction: Transaction) => {
            // Locks the competition row for the rest of this transaction,
            // so two concurrent submissions for the same competition are
            // fully serialized — a plain read of MAX(number) below can't do
            // that on its own, since a row lock on today's max row doesn't
            // stop a second transaction from reading that same (soon
            // stale) row before the first commits.
            await this.competitionModel.findByPk(competitionId, {
              transaction,
              lock: transaction.LOCK.UPDATE,
            });

            await this.assertNotAlreadyInNominations(
              competitionId,
              prepared,
              transaction,
            );
            await this.assertGroupNamesAvailable(
              competitionId,
              prepared,
              transaction,
            );

            const last = await this.entryModel.findOne({
              where: { competitionId },
              order: [['number', 'DESC']],
              transaction,
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

            const groupRows = rows.filter((row) =>
              isGroupLineup(row.lineup ?? null),
            );
            const groupNumbers =
              await this.participantNumbersService.issueGroupNumbers(
                competitionId,
                groupRows.length,
                transaction,
              );
            groupRows.forEach((row, index) => {
              row.groupNumber = groupNumbers[index];
            });

            const created = await this.entryModel.bulkCreate(rows, {
              transaction,
            });

            // Every dancer entered here is now registered for the
            // competition and gets their per-competition participant
            // number (idempotent, so a repeat submission by the same
            // dancer keeps the number) — in the same transaction as the
            // entries themselves, so a failure here rolls the entries back
            // too instead of leaving them without a participant number.
            await this.participantNumbersService.assignAll(
              competitionId,
              participantIds,
              transaction,
            );

            return created;
          },
        );
      } catch (err) {
        // Only a running number lost to a concurrent submission is worth
        // another attempt — the row lock above should make this rare, but a
        // lost race stays possible. Every other unique violation (a person
        // already numbered here) and anything non-unique (validation, FK,
        // null) fails for good and must surface instead of costing another
        // wasted transaction.
        if (isNumberAllocationRace(err)) continue;
        throw err;
      }
    }
    throw new Error(ENTRY_CREATE_FAILED_MESSAGE);
  }

  // Only a global admin may put dancers into an age category their age does
  // not fit; the age is counted on the competition's start date.
  private assertAgeEligible(
    competition: Competition,
    user: AuthenticatedUser,
    birthDates: (string | null)[],
    ageRange: AgeCategoryRange | null,
  ): void {
    if (user.accessLevel === AccessLevel.ADMIN) return;
    if (!isEligibleForAgeCategory(birthDates, ageRange, competition.dateFrom)) {
      throw new BadRequestException(AGE_CATEGORY_MISMATCH_MESSAGE);
    }
  }

  // An edit re-checks the age only when the dancers or the nomination change;
  // the side that did not change is read from the stored entry.
  private async assertEditKeepsAgeEligible(
    competition: Competition,
    user: AuthenticatedUser,
    entry: Entry,
    changedBirthDates: (string | null)[] | undefined,
    changedAgeRange: AgeCategoryRange | null | undefined,
  ): Promise<void> {
    if (changedBirthDates === undefined && changedAgeRange === undefined)
      return;

    const birthDates =
      changedBirthDates ??
      (await this.usersService.findManyByIds(entry.participantIds ?? [])).map(
        (person) => person.birthDate,
      );
    const ageRange =
      changedAgeRange !== undefined
        ? changedAgeRange
        : entry.nominationId
          ? (
              await this.nominationsService.resolveForEntry(competition.id, {
                nominationId: entry.nominationId,
              })
            ).ageRange
          : null;
    this.assertAgeEligible(competition, user, birthDates, ageRange);
  }

  private async prepareEntry(
    competition: Competition,
    dto: CreateEntryDto,
    user: AuthenticatedUser,
  ): Promise<PreparedEntry> {
    if (!dto.nominationId && !dto.nomination) {
      throw new BadRequestException(NOMINATION_REQUIRED_MESSAGE);
    }

    const submitter = await this.applyStudioAndTrainer(
      competition,
      dto,
      user,
      await this.resolveSubmitter(dto, user),
    );
    const routineName = dto.routineName?.trim() || submitter.routineName;
    if (!routineName) {
      throw new BadRequestException(ROUTINE_NAME_REQUIRED_MESSAGE);
    }

    const { nomination, exits, ageCategory, ageRange, league } =
      await this.nominationsService.resolveForEntry(competition.id, {
        nominationId: dto.nominationId,
        name: dto.nomination,
      });
    this.assertAgeEligible(competition, user, submitter.birthDates, ageRange);

    return {
      dto,
      submitter,
      submittedByUserId: user.id,
      routineName,
      nominationId: nomination.id,
      nominationName: nomination.name,
      lineup: resolveLineup(
        dto.participantsCount ??
          submitter.participantsCount ??
          MIN_PARTICIPANTS_PER_ENTRY,
      ),
      exits,
      ageCategory,
      league,
    };
  }

  // Any organizer (on any competition, not only their own), an admin, or
  // this competition's staff may apply for anyone and under any studio and
  // trainer; everyone else only for their own dancers.
  private async canApplyForOthers(
    competition: Competition,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    return (
      meetsLevel(user.accessLevel, AccessLevel.ORGANIZER) ||
      this.isCompetitionStaff(competition, user.id, user.accessLevel)
    );
  }

  // Those who may apply for others (canApplyForOthers) may file the entry
  // under any studio and trainer instead of the dancer's own.
  // A trainer picked without a studio brings their own studio along; a
  // studio trainer (тренер) also brings their studio's head along.
  private async applyStudioAndTrainer(
    competition: Competition,
    dto: CreateEntryDto,
    user: AuthenticatedUser,
    submitter: SubmitterContext,
  ): Promise<SubmitterContext> {
    if (!dto.studioId && !dto.trainerId) return submitter;

    if (!(await this.canApplyForOthers(competition, user))) {
      throw new ForbiddenException(ASSIGN_STUDIO_TRAINER_FORBIDDEN_MESSAGE);
    }

    const trainer = dto.trainerId
      ? await this.usersService.findByIdOrFail(dto.trainerId)
      : null;
    if (trainer && !meetsLevel(trainer.accessLevel, AccessLevel.TRAINER)) {
      throw new BadRequestException(TRAINER_NOT_A_COACH_MESSAGE);
    }
    const leaders = trainer ? await this.studioLeadersFor(trainer) : submitter;
    if (!dto.studioId) return { ...submitter, ...leaders };

    const studio = await this.schoolsService.findByIdOrFail(dto.studioId);
    return {
      ...submitter,
      ...leaders,
      studioId: studio.id,
      studioName: studio.name,
    };
  }

  // Whom an entry of a dancer trained by `coach` is filed under. A studio
  // trainer's dancers go under the trainer's studio and its head, with the
  // trainer named next to the head; anyone else's under the coach themself.
  private async studioLeadersFor(coach: User | null): Promise<StudioLeaders> {
    const school = coach?.schoolId
      ? await this.schoolsService.findByIdOrFail(coach.schoolId)
      : null;
    const studio = {
      studioId: school?.id ?? null,
      studioName: school?.name ?? null,
    };
    if (!coach) {
      return {
        ...studio,
        trainerId: null,
        choreographer: null,
        instructorId: null,
        instructorName: null,
      };
    }
    if (coach.studioRole !== StudioRole.TRAINER) {
      // A studio head who trains the dancers themself is their trainer too.
      const trainsThemself = coach.studioRole === StudioRole.HEAD;
      return {
        ...studio,
        trainerId: coach.id,
        choreographer: this.personName(coach),
        instructorId: trainsThemself ? coach.id : null,
        instructorName: trainsThemself ? this.personName(coach) : null,
      };
    }
    const head = school
      ? await this.usersService.findStudioHead(school.id)
      : null;
    return {
      ...studio,
      trainerId: head?.id ?? null,
      choreographer: head ? this.personName(head) : null,
      instructorId: coach.id,
      instructorName: this.personName(coach),
    };
  }

  private personName(person: User): string {
    return `${person.firstName} ${person.lastName}`.trim();
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
      routineTitle: dto.routineTitle?.trim() || null,
      nomination: exit.label,
      ageCategory: entry.ageCategory,
      league: entry.league,
      program: exit.programName,
      participantsCount,
      lineup: entry.lineup,
      studioId: submitter.studioId,
      trainerId: submitter.trainerId,
      studioName: dto.studioName?.trim() || submitter.studioName,
      choreographer: dto.choreographer?.trim() || submitter.choreographer,
      instructorId: submitter.instructorId,
      instructorName: submitter.instructorName,
      city: dto.city?.trim() || null,
      improv: exit.isImprovisation,
      paymentMethod: dto.paymentMethod ?? null,
      musicName: dto.musicName?.trim() || null,
      submittedByUserId: entry.submittedByUserId,
    } as CreationAttributes<Entry>;
  }

  // The participant ids the user may act on: themselves plus, for a coach,
  // their whole roster and, for a studio head, the studio's trainers.
  private async ownParticipantIds(user: AuthenticatedUser): Promise<string[]> {
    const ids = new Set<string>([user.id]);
    const roster = await this.usersService.listApplicableRoster(user.id);
    roster.forEach((r) => ids.add(r.id));
    return [...ids];
  }

  private entryBelongsTo(entry: Entry, ids: string[]): boolean {
    const set = new Set(ids);
    if (entry.participantId && set.has(entry.participantId)) return true;
    return (entry.participantIds ?? []).some((id) => set.has(id));
  }

  // Who may upload/replace/remove this entry's track (TracksService): the
  // entry's submitter, its performer, the coach of any of its dancers, the
  // trainer it's filed under (the same people listForUser shows it to), or
  // the competition's organizer/admin. Deliberately wider than "заявка
  // належить тому, хто її подав" (§8.5) so a dancer whose coach submitted
  // the entry — or a coach whose dancer submitted it — can still add or
  // change its music.
  //
  // Returns whether access came via the competition's organizer/admin —
  // TracksService uses this to exempt them from the registrationTo music
  // change window, which still applies to a submitter/performer.
  async assertCanManageTrack(
    entry: Entry,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    try {
      await this.loadCompetitionAndAssertAccess(
        entry.competitionId,
        user.id,
        user.accessLevel,
      );
      return true;
    } catch (err) {
      if (!(err instanceof ForbiddenException)) throw err;
    }
    if (
      !this.managesTrackAsMember(
        entry,
        user,
        await this.ownParticipantIds(user),
      )
    ) {
      throw new ForbiddenException(NOT_OWN_PARTICIPANT_MESSAGE);
    }
    return false;
  }

  // The non-staff half of assertCanManageTrack. A studio head only looks at
  // the entries of their trainers' dancers: an entry with a trainer
  // (instructorId) is that trainer's to manage, not the head's.
  private managesTrackAsMember(
    entry: Entry,
    user: AuthenticatedUser,
    ownIds: string[],
  ): boolean {
    const filedUnderUser = entry.instructorId
      ? entry.instructorId === user.id
      : entry.trainerId === user.id;
    return (
      entry.submittedByUserId === user.id ||
      filedUnderUser ||
      this.entryBelongsTo(entry, ownIds)
    );
  }

  // Entries the current user is involved in — their own performances and,
  // if they coach, every performance one of their roster dancers is in,
  // every performance filed under them as head or trainer, whoever submitted
  // it, and, for a studio head, the performances of their trainers' dancers
  // (read-only: canManageTrack is false for those). One page of them,
  // filtered and sorted; only a studio head's entries split by trainer.
  async listForUser(user: AuthenticatedUser, query: MyEntriesQueryDto) {
    const pageParams = resolvePage(
      query.page,
      query.pageSize,
      DEFAULT_MY_ENTRIES_PAGE_SIZE,
      MAX_MY_ENTRIES_PAGE_SIZE,
    );
    const headUserId = user.accessLevel === AccessLevel.COACH ? user.id : null;
    return buildMyEntriesPage(
      await this.loadMyEntries(user),
      {
        q: resolveTypeahead(query.q, MY_ENTRIES_SEARCH_MIN_CHARS) ?? '',
        competitionId: query.competitionId ?? ALL_FILTER_VALUE,
        year: query.year ?? ALL_FILTER_VALUE,
        month: query.month ?? ALL_FILTER_VALUE,
        sort: query.sort ?? DEFAULT_MY_ENTRIES_SORT,
      },
      headUserId,
      pageParams,
      new Date().toISOString().slice(0, ISO_DATE_LENGTH),
    );
  }

  private async loadMyEntries(user: AuthenticatedUser) {
    const ownIds = await this.ownParticipantIds(user);
    const ids = [
      ...ownIds,
      ...(await this.usersService.listStudioTrainersRoster(user.id)).map(
        (dancer) => dancer.id,
      ),
    ];

    const entries = await this.entryModel.findAll({
      where: {
        [Op.or]: [
          { participantIds: { [Op.overlap]: ids } },
          { participantId: { [Op.in]: ids } },
          { trainerId: user.id },
          { instructorId: user.id },
        ],
      },
      include: [Score],
      order: [['createdAt', 'DESC']],
      limit: MAX_MY_ENTRIES,
    });

    const competitionIds = [...new Set(entries.map((e) => e.competitionId))];
    const competitions = await this.competitionModel.findAll({
      where: { id: { [Op.in]: competitionIds } },
    });
    const byId = new Map(competitions.map((c) => [c.id, c]));
    const allParticipantIds = entries.flatMap((e) => e.participantIds ?? []);
    const numbers = await this.participantNumbersService.loadLookup(
      competitionIds,
      allParticipantIds,
    );

    const charges = await this.entryChargeService.withDancerHistory(entries);
    const seesFullCost = meetsLevel(user.accessLevel, AccessLevel.TRAINER);

    const people = await this.usersService.findManyByIds([
      ...new Set(allParticipantIds),
    ]);
    const peopleById = new Map(people.map((p) => [p.id, p]));

    return entries.map((entry) => {
      const competition = byId.get(entry.competitionId);
      const participants: EntryParticipant[] = (entry.participantIds ?? [])
        .map((id) => peopleById.get(id))
        .filter((p): p is User => p !== undefined)
        .map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
        }));
      const charge = charges.get(entry.id) as EntryCharge;
      // A coach pays for the whole number; a dancer sees only their part.
      const amount = seesFullCost ? charge.amount : charge.shareOf(user.id);
      // The extra-time fee for a track over the limit, part of amount.
      const musicFee = seesFullCost ? charge.extraFee : charge.extraFeeShare;
      return {
        ...this.toDto(entry, numbers),
        competitionId: entry.competitionId,
        competitionName: competition?.name ?? null,
        competitionDateFrom: competition?.dateFrom ?? null,
        competitionDateTo: competition?.dateTo ?? null,
        amount,
        musicFee,
        // The nomination alone, without the music fee.
        baseAmount: roundMoney(amount - musicFee),
        participants,
        participantAmounts: this.sharesPerParticipant(
          participants,
          charge,
          user,
          seesFullCost,
        ),
        canManageTrack: this.managesTrackAsMember(entry, user, ownIds),
      };
    });
  }

  // Each dancer's own part of one number, so «сума по учасниках» can charge a
  // group number to everyone who danced it instead of listing the group as a
  // performer of its own. A dancer who may not see the full cost only gets
  // their own part.
  private sharesPerParticipant(
    participants: EntryParticipant[],
    charge: EntryCharge,
    user: AuthenticatedUser,
    seesFullCost: boolean,
  ): ParticipantAmount[] {
    return participants
      .filter((p) => seesFullCost || p.id === user.id)
      .map((p) => ({ participantId: p.id, amount: charge.shareOf(p.id) }));
  }

  async remove(
    competitionId: string,
    entryId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );

    const entry = await this.loadEntry(competitionId, entryId);
    await this.entryModel.sequelize!.transaction(async (transaction) => {
      await this.scheduleService.unscheduleEntry(
        competitionId,
        entry.id,
        transaction,
      );
      await entry.destroy({ transaction });
    });
  }

  // One entry with the dancers named on it — what the staff edit form
  // starts from.
  async findOneForStaff(
    competitionId: string,
    entryId: string,
    user: AuthenticatedUser,
  ) {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      user.id,
      user.accessLevel,
    );
    const entry = await this.loadEntry(competitionId, entryId);
    return this.toStaffDetailsDto(entry);
  }

  // Staff edit of one entry row: its dancers, nomination, routine name and
  // the rest of the form fields. A dancer still performs in a nomination
  // only once, and every newly added dancer gets their participant number.
  async update(
    competitionId: string,
    entryId: string,
    dto: UpdateEntryDto,
    user: AuthenticatedUser,
  ) {
    const competition = await this.loadCompetitionAndAssertAccess(
      competitionId,
      user.id,
      user.accessLevel,
    );
    const entry = await this.loadEntry(competitionId, entryId);
    const changes: Partial<CreationAttributes<Entry>> = {};
    const currentIds = entry.participantIds ?? [];
    let addedIds: string[] = [];
    let changedBirthDates: (string | null)[] | undefined;
    let changedAgeRange: AgeCategoryRange | null | undefined;

    if (dto.participantIds) {
      const submitter = await this.resolveSubmitter(dto, user);
      changedBirthDates = submitter.birthDates;
      changes.participantId = submitter.participantId;
      changes.participantIds = submitter.participantIds;
      addedIds = submitter.participantIds.filter(
        (id) => !currentIds.includes(id),
      );
    }
    const participantsCount =
      dto.participantsCount ?? changes.participantIds?.length;
    if (participantsCount !== undefined) {
      changes.participantsCount = participantsCount;
      changes.lineup = resolveLineup(
        participantsCount || MIN_PARTICIPANTS_PER_ENTRY,
      );
    }

    let nominationName = entry.nomination;
    const nominationChanged =
      dto.nominationId !== undefined && dto.nominationId !== entry.nominationId;
    if (nominationChanged) {
      const { nomination, exits, ageCategory, ageRange, league } =
        await this.nominationsService.resolveForEntry(competitionId, {
          nominationId: dto.nominationId,
        });
      changedAgeRange = ageRange;
      const exit = this.exitMatchingProgram(exits, entry.program);
      nominationName = nomination.name;
      changes.nominationId = nomination.id;
      changes.nomination = exit.label;
      changes.program = exit.programName;
      changes.improv = exit.isImprovisation;
      changes.ageCategory = ageCategory;
      changes.league = league;
    }
    await this.assertEditKeepsAgeEligible(
      competition,
      user,
      entry,
      changedBirthDates,
      changedAgeRange,
    );

    if (dto.routineName !== undefined) {
      changes.routineName = dto.routineName.trim();
    }
    if (dto.routineTitle !== undefined) {
      changes.routineTitle = dto.routineTitle.trim() || null;
    }
    if (dto.studioName !== undefined) {
      changes.studioName = dto.studioName.trim() || null;
    }
    if (dto.choreographer !== undefined) {
      changes.choreographer = dto.choreographer.trim() || null;
    }
    if (dto.city !== undefined) changes.city = dto.city.trim() || null;
    if (dto.paymentMethod !== undefined) {
      changes.paymentMethod = dto.paymentMethod;
    }

    // A new nomination or lineup is checked for every dancer on the entry;
    // the same nomination and lineup only for the dancers just added.
    const finalLineup = changes.lineup ?? entry.lineup;
    const lineupChanged = finalLineup !== entry.lineup;
    const idsToCheck =
      nominationChanged || lineupChanged
        ? (changes.participantIds ?? currentIds)
        : addedIds;
    const finalNominationId = changes.nominationId ?? entry.nominationId;

    await this.entryModel.sequelize!.transaction(
      async (transaction: Transaction) => {
        // Same competition row lock as a new submission, so an edit and a
        // concurrent application cannot both slip one dancer in.
        await this.competitionModel.findByPk(competitionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const clash =
          finalNominationId !== null &&
          (await this.hasNominationClash(
            competitionId,
            finalNominationId,
            finalLineup,
            idsToCheck,
            transaction,
            entry.id,
          ));
        if (clash) {
          throw this.alreadyInNomination(nominationName);
        }
        const isGroup = isGroupLineup(finalLineup);
        if (isGroup && entry.groupNumber === null) {
          [changes.groupNumber] =
            await this.participantNumbersService.issueGroupNumbers(
              competitionId,
              1,
              transaction,
            );
        } else if (!isGroup) {
          changes.groupNumber = null;
        }
        await entry.update(changes, { transaction });
        await this.participantNumbersService.assignAll(
          competitionId,
          addedIds,
          transaction,
        );
      },
    );
    if (nominationChanged) {
      await this.scheduleService.followNominationChange(competitionId, entry);
    }

    return this.toStaffDetailsDto(entry);
  }

  // A per-program nomination has one exit per program: the edited row keeps
  // its program, so the new nomination must offer it too.
  private exitMatchingProgram(
    exits: NominationExit[],
    currentProgram: string | null,
  ): NominationExit {
    if (exits.length === 1) return exits[0];
    const match = exits.find((exit) => exit.programName === currentProgram);
    if (!match) {
      throw new BadRequestException(NOMINATION_PROGRAM_MISMATCH_MESSAGE);
    }
    return match;
  }

  private async loadEntry(competitionId: string, entryId: string) {
    const entry = await this.entryModel.findOne({
      where: { id: entryId, competitionId },
      include: [Score],
    });
    if (!entry) {
      throw new NotFoundException(ENTRY_NOT_FOUND_MESSAGE);
    }
    return entry;
  }

  private async toStaffDetailsDto(entry: Entry) {
    const participantIds = entry.participantIds ?? [];
    const numbers = await this.participantNumbersService.loadLookup(
      [entry.competitionId],
      participantIds,
    );
    const people = await Promise.all(
      participantIds.map((id) => this.usersService.findById(id)),
    );
    const participants: EntryParticipant[] = people
      .filter((person): person is User => person !== null)
      .map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
      }));
    const charges = await this.entryChargeService.withDancerHistory([entry]);
    return {
      ...this.toDto(entry, numbers),
      amount: (charges.get(entry.id) as EntryCharge).amount,
      participants,
    };
  }

  // What the apply form shows before submit: the pay-once rule applied to
  // the dancers' saved entries plus the rows about to be sent.
  async quote(
    competitionId: string,
    dto: QuoteEntriesDto,
    user: AuthenticatedUser,
  ): Promise<EntriesQuote> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const participantIds = dto.participantIds ?? [];
    if (participantIds.length === 0 && dto.participantsCount === undefined) {
      throw new BadRequestException(QUOTE_PARTICIPANTS_REQUIRED_MESSAGE);
    }
    if (!(await this.canApplyForOthers(competition, user))) {
      const own = new Set(await this.ownParticipantIds(user));
      if (participantIds.some((id) => !own.has(id))) {
        throw new ForbiddenException(NOT_OWN_PARTICIPANT_MESSAGE);
      }
    }
    const amounts = await this.entryChargeService.quote(
      competitionId,
      participantIds,
      dto.nominationIds,
      dto.participantsCount,
    );
    return {
      amounts,
      total: amounts.reduce((sum, amount) => roundMoney(sum + amount), 0),
    };
  }

  // Records purchased additional on-stage time and its fee for an overrun
  // performance. An overage the organizer hasn't recorded extra time for
  // stays a warning elsewhere (see OveragesService) and never blocks the
  // performance — this is the only place that turns it into something owed.
  async updateExtraTime(
    competitionId: string,
    entryId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: UpdateEntryExtraTimeDto,
  ) {
    return this.saveExtraTime(
      competitionId,
      entryId,
      requesterId,
      requesterLevel,
      dto.purchasedSec,
      dto.fee,
    );
  }

  // Cancels a recorded extra-time purchase: the entry owes nothing extra
  // again and its overage turns back into a warning.
  async clearExtraTime(
    competitionId: string,
    entryId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ) {
    return this.saveExtraTime(
      competitionId,
      entryId,
      requesterId,
      requesterLevel,
      NO_EXTRA_TIME_SECONDS,
      NO_EXTRA_FEE,
    );
  }

  private async saveExtraTime(
    competitionId: string,
    entryId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    purchasedSec: number,
    fee: number,
  ) {
    const competition = await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
    if (!this.isOrganizerOrAdmin(competition, requesterId, requesterLevel)) {
      throw new ForbiddenException(EXTRA_TIME_ORGANIZER_ONLY_MESSAGE);
    }

    const entry = await this.entryModel.findOne({
      where: { id: entryId, competitionId },
    });
    if (!entry) {
      throw new NotFoundException(ENTRY_NOT_FOUND_MESSAGE);
    }

    entry.purchasedExtraSeconds = purchasedSec;
    entry.extraFee = fee;
    await entry.save();
    await this.scheduleService.refreshExitDuration(entry.id);

    const numbers = await this.participantNumbersService.loadLookup(
      [competitionId],
      entry.participantIds,
    );
    return {
      entry: this.toDto(entry, numbers),
      // The fee is each dancer's: the number owes it for everyone on stage.
      totalDue: roundMoney(Number(entry.extraFee) * dancerCount(entry)),
    };
  }

  // The apply form sends `participantIds` (one for a solo, many for a group);
  // an ADMIN/ORGANIZER adding an entry by hand, or a studio head/trainer
  // submitting a group by headcount, may omit them and pass `routineName`
  // (and `participantsCount`) directly.
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
        birthDates: [],
        routineName: null,
        ...(await this.studioLeadersFor(
          await this.leaderOfUnnamedDancers(user),
        )),
      };
    }

    const [first] = participants;
    const coach = await this.coachOfPerformer(first);

    return {
      participantId: first.id,
      participantIds: participants.map((p) => p.id),
      participantsCount: participants.length,
      birthDates: participants.map((p) => p.birthDate),
      routineName: this.routineNameFor(participants),
      ...(await this.studioLeadersFor(coach)),
    };
  }

  // Dancers who are not named give the entry no coach to take the studio
  // from: a studio head or trainer files it under themself, while an
  // organizer or admin names the studio and trainer (or leaves them empty).
  private async leaderOfUnnamedDancers(
    user: AuthenticatedUser,
  ): Promise<User | null> {
    return isStudioStaff(user.accessLevel)
      ? this.usersService.findByIdOrFail(user.id)
      : null;
  }

  // Whose dancer a performer counts as: a studio trainer performing
  // themself is their studio head's, anyone else their coach's.
  private async coachOfPerformer(performer: User): Promise<User | null> {
    if (performer.studioRole === StudioRole.TRAINER && performer.schoolId) {
      const head = await this.usersService.findStudioHead(performer.schoolId);
      if (head) return head;
    }
    return performer.coachId
      ? this.usersService.findById(performer.coachId)
      : null;
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
    if (isStudioStaff(user.accessLevel)) {
      // A coach or trainer may enter their own roster dancers and
      // themselves; a studio head also the studio's trainers.
      const allowed = new Set(await this.ownParticipantIds(user));
      if (participants.some((participant) => !allowed.has(participant.id))) {
        throw new ForbiddenException(NOT_OWN_PARTICIPANT_MESSAGE);
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

  async loadCompetitionAndAssertAccess(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    if (
      !(await this.isCompetitionStaff(competition, requesterId, requesterLevel))
    ) {
      throw new ForbiddenException(NO_COMPETITION_ACCESS_MESSAGE);
    }
    return competition;
  }

  // Staff of a competition: an admin (any competition), its owner, or a
  // named competition-admin. They manage entries and see the payment
  // method and scores; everyone else gets a read-only start list.
  private async isCompetitionStaff(
    competition: Competition,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<boolean> {
    if (requesterLevel === AccessLevel.ADMIN) return true;
    if (competition.ownerId === requesterId) return true;
    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId: competition.id, adminId: requesterId },
    });
    return membership !== null;
  }

  // An admin, the competition's owner or an account listed among its
  // organizers — staff minus invited team members.
  private isOrganizerOrAdmin(
    competition: Competition,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): boolean {
    return (
      requesterLevel === AccessLevel.ADMIN ||
      competition.ownerId === requesterId ||
      isListedOrganizer(competition, requesterId)
    );
  }

  // The logged-out public listing: no payment method, choreographer,
  // studio, city or music file — just who is on stage and whether a track
  // was uploaded.
  private toPublicDto(entry: Entry, numbers: ParticipantNumberLookup) {
    const participantIds = entry.participantIds ?? [];
    return {
      id: entry.id,
      number: entry.number,
      participantNumbers: numbers.numbersForEntry(entry),
      nomination: entry.nomination,
      ageCategory: entry.ageCategory,
      league: entry.league,
      lineup: entry.lineup,
      improv: entry.improv,
      hasMusic: entry.musicName != null,
    };
  }

  private toDto(entry: Entry, numbers: ParticipantNumberLookup) {
    const participantIds = entry.participantIds ?? [];
    const base = {
      id: entry.id,
      nominationId: entry.nominationId,
      participantId: entry.participantId,
      participantIds,
      // A solo's dancer number, or the group performance's own number.
      participantNumbers: numbers.numbersForEntry(entry),
      number: entry.number,
      routineName: entry.routineName,
      routineTitle: entry.routineTitle,
      nomination: entry.nomination,
      ageCategory: entry.ageCategory,
      league: entry.league,
      program: entry.program,
      participantsCount: entry.participantsCount,
      lineup: entry.lineup,
      studioId: entry.studioId,
      studioName: entry.studioName,
      trainerId: entry.trainerId,
      choreographer: entry.choreographer,
      instructorId: entry.instructorId,
      instructorName: entry.instructorName,
      city: entry.city,
      improv: entry.improv,
      trackNotNeeded: isImprovisationEntry(entry),
      musicName: entry.musicName,
      createdAt: entry.createdAt,
    };
    const scores = entry.scores ?? [];
    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + Number(s.value), 0) / scores.length
        : entry.score == null
          ? null
          : Number(entry.score);

    return {
      ...base,
      paymentMethod: entry.paymentMethod,
      musicUrl: entry.musicUrl,
      score: averageScore,
      scoresCount: scores.length,
      purchasedExtraSeconds: entry.purchasedExtraSeconds,
      extraFee: Number(entry.extraFee),
    };
  }
}
