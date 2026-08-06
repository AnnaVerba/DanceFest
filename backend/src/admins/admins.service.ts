import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Admin } from './admin.model';

@Injectable()
export class AdminsService {
  constructor(
    @InjectModel(Admin)
    private readonly adminModel: typeof Admin,
  ) {}

  findByEmail(email: string): Promise<Admin | null> {
    return this.adminModel.findOne({ where: { email } });
  }

  findById(id: string): Promise<Admin | null> {
    return this.adminModel.findByPk(id);
  }

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<Admin> {
    return this.adminModel.create(data as CreationAttributes<Admin>);
  }
}
