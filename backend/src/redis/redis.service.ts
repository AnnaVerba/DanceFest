import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_DEFAULT_HOST, REDIS_DEFAULT_PORT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Redis {
    if (this.client) return this.client;

    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST') ?? REDIS_DEFAULT_HOST,
      port: Number(this.config.get<string>('REDIS_PORT')) || REDIS_DEFAULT_PORT,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis-з'єднання: ${err.message}`);
    });

    return this.client;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.getClient().set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}
