import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { AccessLevel, isHigherLevel } from '../auth/access-level.enum';
import { SchoolsService } from '../schools/schools.service';
import { School } from '../schools/school.model';
import { User } from './user.model';
import { PlaceholderCoachData } from './placeholder-coach.data';
import { MentorCoach } from './mentor-coach.interface';
import {
  PARTICIPANT_SEARCH_LIMIT,
  PARTICIPANT_SEARCH_MIN_CHARS,
  nameWhere,
} from './participant-search';
import {
  LEVEL_ONLY_GOES_UP_MESSAGE,
  MENTOR_COACH_NOT_FOUND_MESSAGE,
  ONLY_COACH_SELF_UPGRADE_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
} from './users.constants';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  passwordHash: string | null;
  birthDate: string | null;
  accessLevel: AccessLevel;
  schoolId: string | null;
  coachId: string | null;
  confirmed: boolean;
}

export interface RosterParticipantData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  passwordHash: string | null;
  birthDate: string;
  coachId: string;
}

export type LinkRegistrationFields = Partial<
  Pick<
    User,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'passwordHash'
    | 'birthDate'
    | 'accessLevel'
    | 'schoolId'
    | 'confirmed'
  >
>;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    private readonly schoolsService: SchoolsService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ where: { phone } });
  }

  findByEmailOrPhone(login: string): Promise<User | null> {
    return this.userModel.findOne({
      where: { [Op.or]: [{ email: login }, { phone: login }] },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.userModel.create(data as CreationAttributes<User>);
  }

  async updateFields(
    userId: string,
    fields: Partial<
      Pick<User, 'accessLevel' | 'schoolId' | 'coachId' | 'birthDate'>
    >,
  ): Promise<void> {
    await this.userModel.update(fields, { where: { id: userId } });
  }

  async getFullProfile(userId: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    birthDate: string | null;
    accessLevel: AccessLevel;
    schoolId: string | null;
    schoolName: string | null;
    coachId: string | null;
  }> {
    const user = await this.findByIdOrFail(userId);
    const school = user.schoolId
      ? await this.schoolsService.findByIdOrFail(user.schoolId)
      : null;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      accessLevel: user.accessLevel,
      schoolId: user.schoolId,
      schoolName: school?.name ?? null,
      coachId: user.coachId,
    };
  }

  // A mentor coach a user named who is not in the system yet. Keyed by
  // phone: if a row with that phone already exists (stub or real), reuse
  // it rather than creating a duplicate.
  async createPlaceholderCoach(data: PlaceholderCoachData): Promise<User> {
    const existing = await this.findByPhone(data.phone.trim());
    if (existing) {
      return existing;
    }
    return this.userModel.create({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone.trim(),
      email: null,
      passwordHash: null,
      birthDate: null,
      accessLevel: AccessLevel.COACH,
      schoolId: null,
      coachId: null,
      confirmed: false,
    } as CreationAttributes<User>);
  }

  // The real person registers with a stub's phone: fold the form data
  // into the existing row, keeping its id so every coachId / participantId
  // pointing at it stays valid.
  async linkRegistration(
    userId: string,
    fields: LinkRegistrationFields,
  ): Promise<User> {
    await this.userModel.update(fields, { where: { id: userId } });
    return this.findByIdOrFail(userId);
  }

  // Claim by phone: set the first password and mark the row confirmed.
  async claimAccount(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.update(
      { passwordHash, confirmed: true },
      { where: { id: userId } },
    );
  }

  async setMentorCoach(userId: string, coachId: string): Promise<void> {
    const coach = await this.findById(coachId);
    if (!coach) {
      throw new NotFoundException(MENTOR_COACH_NOT_FOUND_MESSAGE);
    }
    await this.userModel.update({ coachId }, { where: { id: userId } });
  }

  // The coach this user trains under, with contact details, or null.
  async getMentorCoach(userId: string): Promise<MentorCoach | null> {
    const user = await this.findByIdOrFail(userId);
    if (!user.coachId) {
      return null;
    }
    const coach = await this.findById(user.coachId);
    if (!coach) {
      return null;
    }
    const school = coach.schoolId
      ? await this.schoolsService.findByIdOrFail(coach.schoolId)
      : null;
    return {
      id: coach.id,
      firstName: coach.firstName,
      lastName: coach.lastName,
      phone: coach.phone,
      schoolName: school?.name ?? null,
      confirmed: coach.confirmed,
    };
  }

  // Coaches a user may pick as their own mentor: real (confirmed) rows at
  // COACH level or above. Stubs are excluded.
  listSelectableCoaches(): Promise<User[]> {
    return this.userModel.findAll({
      where: {
        confirmed: true,
        accessLevel: {
          [Op.in]: [
            AccessLevel.COACH,
            AccessLevel.ORGANIZER,
            AccessLevel.ADMIN,
          ],
        },
      },
      include: [School],
      order: [['lastName', 'ASC']],
    });
  }

  // Organizers a competition can be attributed to — confirmed rows at
  // ORGANIZER level exactly (not ADMIN).
  listSelectableOrganizers(): Promise<User[]> {
    return this.userModel.findAll({
      where: { confirmed: true, accessLevel: AccessLevel.ORGANIZER },
      order: [['lastName', 'ASC']],
    });
  }

  // Self-service climb up the ladder — COACH only. Can only go up.
  async selfUpgrade(
    userId: string,
    level: AccessLevel,
    schoolId?: string,
  ): Promise<User> {
    if (level !== AccessLevel.COACH) {
      throw new BadRequestException(ONLY_COACH_SELF_UPGRADE_MESSAGE);
    }
    const user = await this.findByIdOrFail(userId);
    if (!isHigherLevel(level, user.accessLevel)) {
      throw new BadRequestException(LEVEL_ONLY_GOES_UP_MESSAGE);
    }
    if (schoolId) {
      await this.schoolsService.findByIdOrFail(schoolId);
    }
    await this.userModel.update(
      { accessLevel: level, ...(schoolId ? { schoolId } : {}) },
      { where: { id: userId } },
    );
    return this.findByIdOrFail(userId);
  }

  // ADMIN-only: set any level, including down or up to ADMIN.
  async setLevel(userId: string, level: AccessLevel): Promise<User> {
    await this.findByIdOrFail(userId);
    await this.userModel.update(
      { accessLevel: level },
      { where: { id: userId } },
    );
    return this.findByIdOrFail(userId);
  }

  listRosterByCoach(coachUserId: string, query?: string): Promise<User[]> {
    return this.userModel.findAll({
      where: { coachId: coachUserId, ...nameWhere(query) },
      order: [['lastName', 'ASC']],
    });
  }

  // Name search over every participant — never returns the full table.
  // Requires a query of at least PARTICIPANT_SEARCH_MIN_CHARS characters.
  searchParticipants(query: string): Promise<User[]> {
    if (query.trim().length < PARTICIPANT_SEARCH_MIN_CHARS) {
      return Promise.resolve([]);
    }
    return this.userModel.findAll({
      where: nameWhere(query),
      order: [['lastName', 'ASC']],
      limit: PARTICIPANT_SEARCH_LIMIT,
    });
  }

  // A coach adds a dancer to their roster: a credential-less PARTICIPANT
  // account until the dancer claims it by phone.
  createRosterParticipant(data: RosterParticipantData): Promise<User> {
    return this.userModel.create({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      passwordHash: data.passwordHash,
      birthDate: data.birthDate,
      accessLevel: AccessLevel.PARTICIPANT,
      schoolId: null,
      coachId: data.coachId,
      confirmed: false,
    } as CreationAttributes<User>);
  }
}
