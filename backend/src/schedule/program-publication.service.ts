import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { CreationAttributes } from 'sequelize';
import { isDeepStrictEqual } from 'node:util';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { UsersService } from '../users/users.service';
import { ProgramPublication } from './program-publication.model';
import type { ProgramPublicationStatus } from './program-publication-status';
import { PROGRAM_STATUS } from './program-status';
import {
  buildMineProgram,
  buildPublicProgram,
  type MineProgram,
  type PublicProgramRow,
} from './program-view';
import type { RowPaged } from './pagination';
import { pageSnapshot } from './snapshot-paging';
import type { SectionView } from './section-view';
import { ScheduleService } from './schedule.service';
import {
  DEFAULT_PROGRAM_PAGE_ROWS,
  MAX_PROGRAM_PAGE_ROWS,
  PROGRAM_NOT_PUBLISHED_MESSAGE,
} from './schedule.constants';

@Injectable()
export class ProgramPublicationService {
  constructor(
    @InjectModel(ProgramPublication)
    private readonly publicationModel: typeof ProgramPublication,
    private readonly scheduleService: ScheduleService,
    private readonly usersService: UsersService,
  ) {}

  async status(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<ProgramPublicationStatus> {
    await this.scheduleService.assertAccess(competitionId, requester);
    return this.statusOf(competitionId);
  }

  // Publishes the running order as it is right now. Calling it again on a
  // published program replaces the snapshot with the current version.
  async publish(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<ProgramPublicationStatus> {
    await this.scheduleService.assertAccess(competitionId, requester);
    const snapshot = await this.scheduleService.listSections(competitionId);
    await this.save({
      competitionId,
      status: PROGRAM_STATUS.PUBLISHED,
      publishedAt: new Date(),
      snapshot,
    });
    return this.statusOf(competitionId);
  }

  async unpublish(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<ProgramPublicationStatus> {
    await this.scheduleService.assertAccess(competitionId, requester);
    await this.save({
      competitionId,
      status: PROGRAM_STATUS.DRAFT,
      publishedAt: null,
      snapshot: null,
    });
    return this.statusOf(competitionId);
  }

  async publishedProgram(
    competitionId: string,
    query: {
      dayId?: string;
      venueId?: string;
      page?: string;
      pageSize?: string;
    },
  ): Promise<RowPaged<PublicProgramRow>> {
    const snapshot = await this.publishedSnapshot(competitionId);
    const page = pageSnapshot(
      snapshot,
      { dayId: query.dayId, venueId: query.venueId },
      query.page,
      query.pageSize,
      DEFAULT_PROGRAM_PAGE_ROWS,
      MAX_PROGRAM_PAGE_ROWS,
    );
    return { ...page, rows: buildPublicProgram(page.rows) };
  }

  async publishedMineProgram(
    competitionId: string,
    userId: string,
  ): Promise<MineProgram> {
    const snapshot = await this.publishedSnapshot(competitionId);
    const roster = await this.usersService.listRosterByCoach(userId);
    return buildMineProgram(snapshot, {
      ownIds: [userId],
      studentIds: roster.map((r) => r.id),
    });
  }

  private async save(
    attrs: Pick<
      ProgramPublication,
      'competitionId' | 'status' | 'publishedAt' | 'snapshot'
    >,
  ): Promise<void> {
    await this.publicationModel.upsert(
      attrs as CreationAttributes<ProgramPublication>,
    );
  }

  private async publishedSnapshot(
    competitionId: string,
  ): Promise<SectionView[]> {
    await this.scheduleService.assertCompetition(competitionId);
    const publication = await this.publicationModel.findByPk(competitionId);
    if (
      publication?.status !== PROGRAM_STATUS.PUBLISHED ||
      !publication.snapshot
    ) {
      throw new NotFoundException(PROGRAM_NOT_PUBLISHED_MESSAGE);
    }
    return publication.snapshot;
  }

  private async statusOf(
    competitionId: string,
  ): Promise<ProgramPublicationStatus> {
    const publication = await this.publicationModel.findByPk(competitionId);
    if (
      publication?.status !== PROGRAM_STATUS.PUBLISHED ||
      !publication.snapshot
    ) {
      return {
        status: PROGRAM_STATUS.DRAFT,
        publishedAt: null,
        hasUnpublishedChanges: false,
      };
    }
    // The snapshot went through JSON, so compare against the live order in
    // its JSON form too.
    const live: unknown = JSON.parse(
      JSON.stringify(await this.scheduleService.listSections(competitionId)),
    );
    return {
      status: PROGRAM_STATUS.PUBLISHED,
      publishedAt: publication.publishedAt?.toISOString() ?? null,
      hasUnpublishedChanges: !isDeepStrictEqual(live, publication.snapshot),
    };
  }
}
