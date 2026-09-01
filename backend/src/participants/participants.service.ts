import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, UniqueConstraintError } from 'sequelize';
import { Participant } from './participant.model';
import { CreateParticipantData } from './create-participant.data';
import {
  PARTICIPANT_EMAIL_OR_PHONE_TAKEN_MESSAGE,
  PARTICIPANT_NOT_FOUND_MESSAGE,
} from './participants.constants';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectModel(Participant)
    private readonly participantModel: typeof Participant,
  ) {}

  findAll(): Promise<Participant[]> {
    return this.participantModel.findAll({ order: [['lastName', 'ASC']] });
  }

  findByCoachId(coachId: string): Promise<Participant[]> {
    return this.participantModel.findAll({
      where: { coachId },
      order: [['lastName', 'ASC']],
    });
  }

  findById(id: string): Promise<Participant | null> {
    return this.participantModel.findByPk(id);
  }

  async findByIdOrFail(id: string): Promise<Participant> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new NotFoundException(PARTICIPANT_NOT_FOUND_MESSAGE);
    }
    return participant;
  }

  findByEmail(email: string): Promise<Participant | null> {
    return this.participantModel.findOne({ where: { email } });
  }

  async existsByEmailOrPhone(email: string, phone: string): Promise<boolean> {
    const count = await this.participantModel.count({
      where: { [Op.or]: [{ email }, { phone }] },
    });
    return count > 0;
  }

  async create(data: CreateParticipantData): Promise<Participant> {
    try {
      return await this.participantModel.create(
        data as CreationAttributes<Participant>,
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(PARTICIPANT_EMAIL_OR_PHONE_TAKEN_MESSAGE);
      }
      throw error;
    }
  }
}
