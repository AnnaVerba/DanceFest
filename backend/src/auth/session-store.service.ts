import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { CreationAttributes, Op } from 'sequelize';
import { Session } from './session.model';
import { ClientContext } from './client-context.interface';
import { DEFAULT_REFRESH_EXPIRES_IN_SECONDS } from './auth.constants';

@Injectable()
export class SessionStoreService {
  constructor(
    @InjectModel(Session)
    private readonly sessionModel: typeof Session,
    private readonly config: ConfigService,
  ) {}

  async create(
    userId: string,
    tokenId: string,
    ctx: ClientContext,
  ): Promise<void> {
    await this.sessionModel.create({
      userId,
      tokenId,
      expiresAt: new Date(Date.now() + this.ttlSeconds() * 1000),
      fingerprint: ctx.fingerprint,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      lastUsedAt: new Date(),
    } as CreationAttributes<Session>);
  }

  async findActive(userId: string, tokenId: string): Promise<Session | null> {
    return this.sessionModel.findOne({
      where: { userId, tokenId, expiresAt: { [Op.gt]: new Date() } },
    });
  }

  async revoke(userId: string, tokenId: string): Promise<void> {
    await this.sessionModel.destroy({ where: { userId, tokenId } });
  }

  // Refresh tokens are already rejected past expiresAt (see findActive); this
  // is what stops the table growing forever. Called by HousekeepingService.
  async deleteExpired(): Promise<number> {
    return this.sessionModel.destroy({
      where: { expiresAt: { [Op.lt]: new Date() } },
    });
  }

  private ttlSeconds(): number {
    return (
      Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) ||
      DEFAULT_REFRESH_EXPIRES_IN_SECONDS
    );
  }
}
