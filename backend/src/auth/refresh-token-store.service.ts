import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import {
  DEFAULT_REFRESH_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_KEY_PREFIX,
} from './auth.constants';

@Injectable()
export class RefreshTokenStoreService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async save(adminId: string, tokenId: string): Promise<void> {
    await this.redis.set(this.buildKey(adminId, tokenId), '1', this.ttl());
  }

  async isActive(adminId: string, tokenId: string): Promise<boolean> {
    const value = await this.redis.get(this.buildKey(adminId, tokenId));
    return value !== null;
  }

  async revoke(adminId: string, tokenId: string): Promise<void> {
    await this.redis.del(this.buildKey(adminId, tokenId));
  }

  private buildKey(adminId: string, tokenId: string): string {
    return `${REFRESH_TOKEN_KEY_PREFIX}${adminId}:${tokenId}`;
  }

  private ttl(): number {
    return (
      Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) ||
      DEFAULT_REFRESH_EXPIRES_IN_SECONDS
    );
  }
}
