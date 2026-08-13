import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from './competition.model';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
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

  async update(id: string, dto: UpdateCompetitionDto): Promise<Competition> {
    const competition = await this.findOne(id);
    return competition.update(dto);
  }

  async remove(id: string): Promise<void> {
    const competition = await this.findOne(id);
    await competition.destroy();
  }
}
