import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from './competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
  ) {}

  findAll(): Promise<Competition[]> {
    return this.competitionModel.findAll();
  }

  async findOne(id: string): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(id);
    if (!competition) {
      throw new NotFoundException(`Competition with id ${id} not found`);
    }
    return competition;
  }

  create(dto: CreateCompetitionDto, ownerId: string): Promise<Competition> {
    return this.competitionModel.create({
      ...dto,
      ownerId,
    } as CreationAttributes<Competition>);
  }

  async update(
    id: string,
    dto: UpdateCompetitionDto,
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.findOne(id);
    await this.assertCanEdit(competition, requesterId);
    return competition.update(dto);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    const competition = await this.findOne(id);
    this.assertOwner(competition, requesterId);
    await competition.destroy();
  }

  /** Редагувати конкурс може власник або будь-який адмін, доданий до команди. */
  private async assertCanEdit(
    competition: Competition,
    requesterId: string,
  ): Promise<void> {
    if (competition.ownerId === requesterId) return;
    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId: competition.id, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException('Немає доступу до цього конкурсу');
    }
  }

  private assertOwner(competition: Competition, requesterId: string): void {
    if (competition.ownerId !== requesterId) {
      throw new ForbiddenException(
        'Цю дію може виконати лише власник конкурсу',
      );
    }
  }
}
