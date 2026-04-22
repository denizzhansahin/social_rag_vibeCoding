import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { SpatialTemporalLog } from './entities/spatial-temporal-log.entity';
import { CreateSpatialTemporalLogInput } from './dto/create-spatial-temporal-log.input';
import { PunctualityStatus } from './enums/punctuality-status.enum';

@Injectable()
export class SpatialTemporalLogsService {
  constructor(
    @InjectRepository(SpatialTemporalLog)
    private repo: Repository<SpatialTemporalLog>,
    private readonly redisService: RedisService,
  ) {}

  async create(input: CreateSpatialTemporalLogInput): Promise<SpatialTemporalLog> {
    let parsedContext = {};
    if (input.spatialContext) {
      try { parsedContext = JSON.parse(input.spatialContext); }
      catch (e) { console.warn('⚠️ Spatial Context JSON parse edilemedi.'); }
    }

    const log = this.repo.create({
      userId: input.userId,
      sessionId: input.sessionId,
      terminalId: input.terminalId,
      physicalZone: input.physicalZone,
      scanTime: input.scanTime,
      expectedTime: input.expectedTime,
      delayMinutes: input.delayMinutes,
      punctuality: input.punctuality,
      spatialContext: parsedContext,
    });

    await this.repo.save(log);
    console.log(`📍 Yoklama: ${log.punctuality} - User: ${log.userId} - Zone: ${log.physicalZone}`);

    await this.redisService.pushTaskToQueue('analyze_spatial_log', {
      log_id: log.id,
      punctuality: log.punctuality,
    });

    return log;
  }

  async quickCheckin(userId: string, eventCode: string): Promise<SpatialTemporalLog> {
    const now = new Date();

    const log = this.repo.create({
      userId,
      sessionId: eventCode,
      terminalId: eventCode,
      physicalZone: eventCode,
      scanTime: now,
      punctuality: PunctualityStatus.on_time,
      spatialContext: { method: 'qr_scan_or_manual', timestamp: now.toISOString() } as any,
    });

    await this.repo.save(log);
    console.log(`⚡ Hızlı Yoklama: ${userId} → ${eventCode}`);

    await this.redisService.pushTaskToQueue('analyze_spatial_log', {
      log_id: log.id,
      punctuality: log.punctuality,
    });

    return log;
  }

  async findAll(): Promise<SpatialTemporalLog[]> {
    return this.repo.find({ order: { scanTime: 'DESC' }, take: 100 });
  }

  /** Bir etkinliğin yoklama kayıtları */
  async findBySession(sessionId: string): Promise<SpatialTemporalLog[]> {
    return this.repo.find({ where: { sessionId }, order: { scanTime: 'ASC' } });
  }

  /** Bir kullanıcının tüm yoklama geçmişi */
  async findByUser(userId: string): Promise<SpatialTemporalLog[]> {
    return this.repo.find({ where: { userId }, order: { scanTime: 'DESC' } });
  }

  /** Etkinlik bazlı yoklama istatistikleri */
  async getAttendanceStats(sessionId: string): Promise<{ onTime: number; late: number; absent: number; total: number }> {
    const logs = await this.repo.find({ where: { sessionId } });
    const stats = { onTime: 0, late: 0, absent: 0, early: 0, total: logs.length };
    for (const log of logs) {
      if (log.punctuality === 'on_time') stats.onTime++;
      else if (log.punctuality === 'late') stats.late++;
      else if (log.punctuality === 'absent') stats.absent++;
      else if (log.punctuality === 'early') stats.early++;
    }
    stats.onTime += stats.early; // early da "zamanında" sayılır
    return stats;
  }
}
