import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { School } from './school.model';
import { CreateSchoolDto } from './dto/create-school.dto';
import {
  SCHOOL_ALREADY_EXISTS_MESSAGE,
  SCHOOL_NOT_FOUND_MESSAGE,
} from './schools.constants';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectModel(School)
    private readonly schoolModel: typeof School,
  ) {}

  findAll(): Promise<School[]> {
    return this.schoolModel.findAll({ order: [['name', 'ASC']] });
  }

  async findByIdOrFail(id: string): Promise<School> {
    const school = await this.schoolModel.findByPk(id);
    if (!school) {
      throw new NotFoundException(SCHOOL_NOT_FOUND_MESSAGE);
    }
    return school;
  }

  existsById(id: string): Promise<boolean> {
    return this.schoolModel.count({ where: { id } }).then((count) => count > 0);
  }

  async create(dto: CreateSchoolDto): Promise<School> {
    const name = dto.name.trim();
    const duplicate = await this.schoolModel.findOne({
      where: { name: { [Op.iLike]: name } },
    });
    if (duplicate) {
      throw new ConflictException(SCHOOL_ALREADY_EXISTS_MESSAGE);
    }
    return this.schoolModel.create({ name } as CreationAttributes<School>);
  }
}
