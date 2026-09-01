import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { Organizer } from './organizer.model';
import { CreateOrganizerData } from './create-organizer.data';

@Injectable()
export class OrganizersService {
  constructor(
    @InjectModel(Organizer)
    private readonly organizerModel: typeof Organizer,
  ) {}

  findById(id: string): Promise<Organizer | null> {
    return this.organizerModel.findByPk(id);
  }

  findByEmail(email: string): Promise<Organizer | null> {
    return this.organizerModel.findOne({ where: { email } });
  }

  async existsByEmailOrPhone(email: string, phone: string): Promise<boolean> {
    const count = await this.organizerModel.count({
      where: { [Op.or]: [{ email }, { phone }] },
    });
    return count > 0;
  }

  create(data: CreateOrganizerData): Promise<Organizer> {
    return this.organizerModel.create(data as CreationAttributes<Organizer>);
  }
}
