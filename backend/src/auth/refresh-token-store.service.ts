import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { CreationAttributes, Op } from 'sequelize';
import { RefreshToken } from './refresh-token.model';
import { DEFAULT_REFRESH_EXPIRES_IN_SECONDS } from './auth.constants';

@Injectable()
export class RefreshTokenStoreService {
  constructor(
    @InjectModel(RefreshToken)
    private readonly refreshTokenModel: typeof RefreshToken,
    private readonly config: ConfigService,
  ) {}

  async save(userId: string, tokenId: string): Promise<void> {
    await this.refreshTokenModel.create({
      userId,
      tokenId,
      expiresAt: new Date(Date.now() + this.ttlSeconds() * 1000),
    } as CreationAttributes<RefreshToken>);
  }

  async isActive(userId: string, tokenId: string): Promise<boolean> {
    const record = await this.refreshTokenModel.findOne({
      where: { userId, tokenId, expiresAt: { [Op.gt]: new Date() } },
    });
    return record !== null;
  }

  async revoke(userId: string, tokenId: string): Promise<void> {
    await this.refreshTokenModel.destroy({ where: { userId, tokenId } });
  }

  private ttlSeconds(): number {
    return (
      Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) ||
      DEFAULT_REFRESH_EXPIRES_IN_SECONDS
    );
  }
}
