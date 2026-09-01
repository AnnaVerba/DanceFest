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

  async save(userId: string, tokenId: string): Promise<void> {
    await this.redis.set(this.buildKey(userId, tokenId), '1', this.ttl());
  }

  async isActive(userId: string, tokenId: string): Promise<boolean> {
    const value = await this.redis.get(this.buildKey(userId, tokenId));
    return value !== null;
  }

  async revoke(userId: string, tokenId: string): Promise<void> {
    await this.redis.del(this.buildKey(userId, tokenId));
  }

  private buildKey(userId: string, tokenId: string): string {
    return `${REFRESH_TOKEN_KEY_PREFIX}${userId}:${tokenId}`;
  }

  private ttl(): number {
    return (
      Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) ||
      DEFAULT_REFRESH_EXPIRES_IN_SECONDS
    );
  }
}
