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
import { TYPEAHEAD_LIMIT, resolveTypeahead } from '../common/pagination';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectModel(School)
    private readonly schoolModel: typeof School,
  ) {}

  // Typeahead: the picker sends `q` once the user has typed a couple of
  // letters; before that it gets nothing back.
  search(rawQuery?: string): Promise<School[]> {
    const q = resolveTypeahead(rawQuery);
    if (q === null) return Promise.resolve([]);
    return this.schoolModel.findAll({
      where: { name: { [Op.iLike]: `%${q}%` } },
      order: [['name', 'ASC']],
      limit: TYPEAHEAD_LIMIT,
    });
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
