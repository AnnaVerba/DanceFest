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
  SCHOOL_HEAD_TYPEAHEAD_MIN_CHARS,
  SCHOOL_NOT_FOUND_MESSAGE,
} from './schools.constants';
import { TYPEAHEAD_LIMIT, resolveTypeahead } from '../common/pagination';
import { User } from '../users/user.model';
import { NOT_DELETED } from '../users/deleted-user';
import { StudioRole } from '../users/studio-role.enum';
import type { SchoolHead } from './school-head.interface';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectModel(School)
    private readonly schoolModel: typeof School,
    @InjectModel(User)
    private readonly userModel: typeof User,
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

  // Typeahead over studio heads by first or last name — for a trainer who
  // knows their head but not the studio's exact name. Only heads with a
  // studio can be offered: the point is to fill the studio field.
  async searchHeads(rawQuery?: string): Promise<SchoolHead[]> {
    const q = resolveTypeahead(rawQuery, SCHOOL_HEAD_TYPEAHEAD_MIN_CHARS);
    if (q === null) return [];
    const like = { [Op.iLike]: `%${q}%` };
    const heads = await this.userModel.findAll({
      where: {
        ...NOT_DELETED,
        studioRole: StudioRole.HEAD,
        schoolId: { [Op.ne]: null },
        [Op.or]: [{ firstName: like }, { lastName: like }],
      },
      include: [School],
      order: [['lastName', 'ASC']],
      limit: TYPEAHEAD_LIMIT,
    });
    return heads.flatMap((head) =>
      head.school && head.schoolId
        ? [
            {
              id: head.id,
              firstName: head.firstName,
              lastName: head.lastName,
              schoolId: head.schoolId,
              schoolName: head.school.name,
            },
          ]
        : [],
    );
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
