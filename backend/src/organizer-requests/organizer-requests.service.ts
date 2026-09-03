import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { AccessLevel, meetsLevel } from '../auth/access-level.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { ApplicationStatus } from '../competition-applications/application-status.enum';
import { OrganizerRequest } from './organizer-request.model';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';
import { ReviewOrganizerRequestDto } from './dto/review-organizer-request.dto';
import {
  ALREADY_ORGANIZER_MESSAGE,
  REQUEST_ALREADY_PENDING_MESSAGE,
  REQUEST_NOT_FOUND_MESSAGE,
  REQUEST_NOT_OWNED_MESSAGE,
  REQUEST_NOT_PENDING_MESSAGE,
} from './organizer-requests.constants';

@Injectable()
export class OrganizerRequestsService {
  constructor(
    @InjectModel(OrganizerRequest)
    private readonly requestModel: typeof OrganizerRequest,
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
  ) {}

  async create(
    dto: CreateOrganizerRequestDto,
    user: AuthenticatedUser,
  ): Promise<OrganizerRequest> {
    if (meetsLevel(user.accessLevel, AccessLevel.ORGANIZER)) {
      throw new BadRequestException(ALREADY_ORGANIZER_MESSAGE);
    }
    const pending = await this.requestModel.findOne({
      where: { userId: user.id, status: ApplicationStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException(REQUEST_ALREADY_PENDING_MESSAGE);
    }
    await this.schoolsService.findByIdOrFail(dto.schoolId);

    return this.requestModel.create({
      userId: user.id,
      schoolId: dto.schoolId,
      note: dto.note ?? null,
      status: ApplicationStatus.PENDING,
    } as CreationAttributes<OrganizerRequest>);
  }

  findMine(user: AuthenticatedUser): Promise<OrganizerRequest[]> {
    return this.requestModel.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
    });
  }

  findAll(status?: ApplicationStatus): Promise<OrganizerRequest[]> {
    return this.requestModel.findAll({
      where: status ? { status } : undefined,
      order: [['createdAt', 'DESC']],
    });
  }

  async review(
    id: string,
    dto: ReviewOrganizerRequestDto,
    admin: AuthenticatedUser,
  ): Promise<OrganizerRequest> {
    const request = await this.findByIdOrFail(id);
    if (request.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(REQUEST_NOT_PENDING_MESSAGE);
    }

    request.status = dto.status;
    request.decisionNote = dto.decisionNote ?? null;
    request.reviewedByUserId = admin.id;
    request.reviewedAt = new Date();
    await request.save();

    if (dto.status === ApplicationStatus.APPROVED) {
      await this.usersService.setLevel(request.userId, AccessLevel.ORGANIZER);
      await this.usersService.updateFields(request.userId, {
        schoolId: request.schoolId,
      });
    }
    return request;
  }

  async cancelOwn(
    id: string,
    user: AuthenticatedUser,
  ): Promise<OrganizerRequest> {
    const request = await this.findByIdOrFail(id);
    if (request.userId !== user.id) {
      throw new ForbiddenException(REQUEST_NOT_OWNED_MESSAGE);
    }
    if (request.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(REQUEST_NOT_PENDING_MESSAGE);
    }
    request.status = ApplicationStatus.CANCELLED;
    await request.save();
    return request;
  }

  private async findByIdOrFail(id: string): Promise<OrganizerRequest> {
    const request = await this.requestModel.findByPk(id);
    if (!request) {
      throw new NotFoundException(REQUEST_NOT_FOUND_MESSAGE);
    }
    return request;
  }
}
