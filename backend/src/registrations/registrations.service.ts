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
import { Person } from './person.model';
import { Registration } from './registration.model';
import { RegistrationParticipant } from './registration-participant.model';
import { Performance } from './performance.model';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { PersonInputDto } from './dto/person-input.dto';
import { UpdateRegistrationStatusDto } from './dto/update-registration-status.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';

const DETAIL_INCLUDE = [
  { model: Person, as: 'coach' },
  { model: Person, as: 'submittedBy' },
  {
    model: RegistrationParticipant,
    as: 'participants',
    include: [{ model: Person, as: 'person' }],
  },
  { model: Performance, as: 'performances' },
];

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
    @InjectModel(Person)
    private readonly personModel: typeof Person,
    @InjectModel(Registration)
    private readonly registrationModel: typeof Registration,
    @InjectModel(RegistrationParticipant)
    private readonly participantModel: typeof RegistrationParticipant,
    @InjectModel(Performance)
    private readonly performanceModel: typeof Performance,
  ) {}

  async create(competitionId: string, dto: CreateRegistrationDto) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }

    const nomination = await this.nominationModel.findOne({
      where: { id: dto.nominationId, competitionId },
    });
    if (!nomination) {
      throw new BadRequestException(
        'Цю номінацію не знайдено серед номінацій конкурсу',
      );
    }

    const coach = await this.findOrCreatePerson(dto.coach);
    const submittedBy = await this.findOrCreatePerson(dto.submittedBy);
    const participants = await Promise.all(
      dto.participants.map((p) => this.findOrCreatePerson(p)),
    );

    const registration = await this.registrationModel.create({
      competitionId,
      nominationId: dto.nominationId,
      routineName: dto.routineName?.trim() || null,
      coachId: coach?.id ?? null,
      submittedByPersonId: submittedBy?.id ?? null,
      choreographer: dto.choreographer?.trim() || null,
      studioName: dto.studioName?.trim() || null,
      city: dto.city?.trim() || null,
      improv: dto.improv ?? false,
    } as CreationAttributes<Registration>);

    await this.participantModel.bulkCreate(
      participants
        .filter((p): p is Person => p !== null)
        .map((person) => ({
          registrationId: registration.id,
          personId: person.id,
        })) as CreationAttributes<RegistrationParticipant>[],
    );

    await this.performanceModel.create({
      registrationId: registration.id,
      competitionId,
    } as CreationAttributes<Performance>);

    return this.findOne(competitionId, registration.id);
  }

  async list(competitionId: string, requesterId: string) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const registrations = await this.registrationModel.findAll({
      where: { competitionId },
      include: DETAIL_INCLUDE,
      order: [['createdAt', 'ASC']],
    });
    return registrations.map((r) => this.toDto(r));
  }

  async findOne(competitionId: string, registrationId: string) {
    const registration = await this.registrationModel.findOne({
      where: { id: registrationId, competitionId },
      include: DETAIL_INCLUDE,
    });
    if (!registration) {
      throw new NotFoundException('Заявку не знайдено');
    }
    return this.toDto(registration);
  }

  async updateStatus(
    competitionId: string,
    registrationId: string,
    requesterId: string,
    dto: UpdateRegistrationStatusDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const registration = await this.registrationModel.findOne({
      where: { id: registrationId, competitionId },
    });
    if (!registration) {
      throw new NotFoundException('Заявку не знайдено');
    }
    registration.status = dto.status;
    await registration.save();
    return this.findOne(competitionId, registrationId);
  }

  async remove(
    competitionId: string,
    registrationId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const registration = await this.registrationModel.findOne({
      where: { id: registrationId, competitionId },
    });
    if (!registration) {
      throw new NotFoundException('Заявку не знайдено');
    }
    await registration.destroy();
  }

  async updatePerformance(
    competitionId: string,
    registrationId: string,
    performanceId: string,
    requesterId: string,
    dto: UpdatePerformanceDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const performance = await this.performanceModel.findOne({
      where: { id: performanceId, registrationId, competitionId },
    });
    if (!performance) {
      throw new NotFoundException('Виступ не знайдено');
    }
    if (dto.round) performance.round = dto.round;
    if (dto.status) performance.status = dto.status;
    await performance.save();
    return this.findOne(competitionId, registrationId);
  }

  private async findOrCreatePerson(
    input: PersonInputDto | undefined,
  ): Promise<Person | null> {
    if (!input) return null;

    const email = input.email?.trim().toLowerCase();
    if (email) {
      const existing = await this.personModel.findOne({ where: { email } });
      if (existing) return existing;
    }

    return this.personModel.create({
      name: input.name.trim(),
      email: email || null,
      phone: input.phone?.trim() || null,
      dateOfBirth: input.dateOfBirth || null,
    } as CreationAttributes<Person>);
  }

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

  private toDto(registration: Registration) {
    return {
      id: registration.id,
      competitionId: registration.competitionId,
      nominationId: registration.nominationId,
      routineName: registration.routineName,
      choreographer: registration.choreographer,
      studioName: registration.studioName,
      city: registration.city,
      improv: registration.improv,
      status: registration.status,
      coach: registration.coach ? this.personToDto(registration.coach) : null,
      submittedBy: registration.submittedBy
        ? this.personToDto(registration.submittedBy)
        : null,
      participants: (registration.participants ?? []).map((p) =>
        this.personToDto(p.person),
      ),
      performances: (registration.performances ?? []).map((perf) => ({
        id: perf.id,
        programName: perf.programName,
        round: perf.round,
        status: perf.status,
      })),
      createdAt: registration.createdAt,
    };
  }

  private personToDto(person: Person) {
    return {
      id: person.id,
      name: person.name,
      email: person.email,
      phone: person.phone,
      dateOfBirth: person.dateOfBirth,
    };
  }
}
