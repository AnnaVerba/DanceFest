import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AccessLevel } from '../auth/access-level.enum';
import { SALT_ROUNDS } from '../auth/auth.constants';
import {
  ADMIN_EMAIL_ENV,
  ADMIN_PASSWORD_ENV,
  SEED_ADMIN_FIRST_NAME,
  SEED_ADMIN_LAST_NAME,
  SEED_ADMIN_PHONE_PREFIX,
} from './app-bootstrap.constants';

@Injectable()
export class AppBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AppBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>(ADMIN_EMAIL_ENV);
    const password = this.config.get<string>(ADMIN_PASSWORD_ENV);
    if (!email || !password) {
      return;
    }
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.usersService.create({
      firstName: SEED_ADMIN_FIRST_NAME,
      lastName: SEED_ADMIN_LAST_NAME,
      phone: SEED_ADMIN_PHONE_PREFIX + randomUUID(),
      email,
      passwordHash,
      birthDate: null,
      accessLevel: AccessLevel.ADMIN,
      schoolId: null,
      coachId: null,
      confirmed: true,
    });
    this.logger.log(`Seeded first admin ${email}`);
  }
}
