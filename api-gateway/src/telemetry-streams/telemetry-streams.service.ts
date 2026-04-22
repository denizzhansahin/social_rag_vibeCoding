import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { TelemetryStream } from './entities/telemetry-stream.entity';
import { CreateTelemetryStreamInput } from './dto/create-telemetry-stream.input';

@Injectable()
export class TelemetryStreamsService {
  constructor(
    @InjectRepository(TelemetryStream)
    private telemetryRepository: Repository<TelemetryStream>,
    private readonly redisService: RedisService,
  ) {}

  async create(input: CreateTelemetryStreamInput): Promise<TelemetryStream> {
    let parsedMetrics = {};
    if (input.metrics) {
      try {
        parsedMetrics = JSON.parse(input.metrics);
      } catch (e) {
        console.warn('⚠️ Telemetry Metrics JSON parse edilemedi');
      }
    }

    const stream = this.telemetryRepository.create({
      userId: input.userId,
      sessionId: input.sessionId,
      eventType: input.eventType,
      targetPath: input.targetPath,
      metrics: parsedMetrics,
    });

    await this.telemetryRepository.save(stream);
    console.log(`📡 Telemetri Loglandı: ${stream.eventType} - User: ${stream.userId}`);

    // Telemetri loglandığı an, arka planda davranış analizi için Redis'e atıyoruz.
    await this.redisService.pushTaskToQueue('analyze_telemetry', {
      telemetry_id: stream.id,
      event_type: stream.eventType,
    });

    return stream;
  }

  async findAll(): Promise<TelemetryStream[]> {
    return this.telemetryRepository.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async getGlobalTelemetryStats(): Promise<any> {
    const stats = await this.telemetryRepository
      .createQueryBuilder('t')
      .select('t.eventType', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(CAST(t.metrics->>\'stress_index\' AS FLOAT))', 'avgStress')
      .addSelect('AVG(CAST(t.metrics->>\'scroll_speed\' AS FLOAT))', 'avgScroll')
      .groupBy('t.eventType')
      .getRawMany();
    
    return stats;
  }

  async batchCreate(events: any[]): Promise<boolean> {
    for (const event of events) {
      try {
        await this.create({
          userId: event.userId || event.payload?.userId || 'unknown',
          sessionId: event.sessionId || event.payload?.sessionId || 'unknown',
          eventType: (event.type || event.payload?.type || 'click') as any,
          targetPath: event.targetPath || event.payload?.targetPath || '/',
          metrics: JSON.stringify(event.payload || {}),
        });
      } catch (e) {
        console.error('❌ Batch Telemetry Error:', e);
      }
    }
    return true;
  }
}
