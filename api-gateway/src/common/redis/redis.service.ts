import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });

    this.client.on('connect', () => {
      console.log('✅ NestJS -> Redis bağlantısı kuruldu.');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis bağlantı hatası:', err.message);
    });
  }

  /**
   * AI Worker'a görev gönderir.
   * Python tarafındaki main.py bu kuyruğu dinliyor.
   */
  async pushTaskToQueue(taskName: string, payload: Record<string, any>): Promise<void> {
    const message = JSON.stringify({
      task_name: taskName,
      payload: payload,
    });
    await this.client.lpush('ai_task_queue', message);
    console.log(`📤 Redis kuyruğuna görev gönderildi: ${taskName}`);
  }

  /**
   * Basit cache set
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Basit cache get
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
