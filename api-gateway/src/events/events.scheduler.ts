import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { EventEntity } from './event.entity';
import { FeedPostEntity } from '../feed-posts/feed-post.entity';

/**
 * Etkinlik Zamanlayıcısı
 * NestJS Schedule paketi olmadan çalışır (setInterval tabanlı)
 * - Her 5 dakikada başlayan etkinlikler için sistem postu oluşturur
 * - Biten etkinlikler için değerlendirme anketi postu oluşturur
 * - Her gece 23:00'de günlük özet postu oluşturur
 */
@Injectable()
export class EventsSchedulerService implements OnModuleInit, OnModuleDestroy {
  private cronInterval: NodeJS.Timeout | null = null;
  private dailySummaryInterval: NodeJS.Timeout | null = null;
  private readonly processedStartEvents = new Set<string>();
  private readonly processedEndEvents = new Set<string>();
  private lastDailySummaryDate = '';

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(FeedPostEntity)
    private readonly feedPostRepo: Repository<FeedPostEntity>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    // Her 5 dakikada bir kontrol et
    this.cronInterval = setInterval(() => this.checkEvents(), 5 * 60 * 1000);
    // Günlük özet: her 1 saatte bir kontrol et (gece 23:00-23:59 arasında)
    this.dailySummaryInterval = setInterval(() => this.checkDailySummary(), 60 * 60 * 1000);
    console.log('[EventsScheduler] ✅ Etkinlik zamanlayıcısı başlatıldı (5dk aralıklı)');
    // İlk kontrolü hemen yap
    setTimeout(() => this.checkEvents(), 5000);
  }

  onModuleDestroy() {
    if (this.cronInterval) clearInterval(this.cronInterval);
    if (this.dailySummaryInterval) clearInterval(this.dailySummaryInterval);
  }

  /**
   * Başlayan ve biten etkinlikleri kontrol et
   */
  private async checkEvents() {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 dk öncesi

      // Başlayan etkinlikler (son 5 dakika içinde başlamış)
      const startingEvents = await this.eventRepo.find({
        where: {
          startTime: LessThanOrEqual(now),
          isActive: true,
        },
      });

      for (const event of startingEvents) {
        if (this.processedStartEvents.has(event.id)) continue;
        const startedSince = now.getTime() - new Date(event.startTime).getTime();
        // Son 10 dakika içinde başladıysa post oluştur
        if (startedSince >= 0 && startedSince <= 10 * 60 * 1000) {
          await this.createEventStartPost(event);
          this.processedStartEvents.add(event.id);
        }
      }

      // Biten etkinlikler (endTime varsa ve geçtiyse)
      const endedEvents = await this.dataSource.query(`
        SELECT * FROM events 
        WHERE is_active = true 
          AND end_time IS NOT NULL 
          AND end_time <= $1 
          AND end_time >= $2
      `, [now, windowStart]);

      for (const event of endedEvents) {
        if (this.processedEndEvents.has(event.id)) continue;
        await this.createEventEndPost(event);
        await this.createEventSurveyPost(event);
        this.processedEndEvents.add(event.id);
      }
    } catch (err) {
      console.error('[EventsScheduler] checkEvents hata:', err);
    }
  }

  /**
   * Etkinlik başlangıç sistemi postu
   */
  private async createEventStartPost(event: EventEntity) {
    try {
      // Daha önce bu etkinlik için başlangıç postu oluşturulmuş mu kontrol et
      const existing = await this.dataSource.query(`
        SELECT id FROM feed_posts 
        WHERE is_system = true AND scope = 'global'
          AND metadata->>'eventId' = $1 AND metadata->>'type' = 'event_start'
        LIMIT 1
      `, [event.id]);
      if (existing && existing.length > 0) return;


      const post = this.feedPostRepo.create({
        authorId: '00000000-0000-0000-0000-000000000000',
        contentText: `🚀 Etkinlik Başladı: "${event.title}"\n\n${event.description || ''}\n\n📍 ${event.location || 'Konum belirtilmedi'}`,
        scope: 'global',
        postType: 'announcement',
        isSystem: true,
        isPinned: true,
        reactions: {},
        metadata: {
          eventId: event.id,
          type: 'event_start',
          eventTitle: event.title,
          startTime: event.startTime,
        },
      });
      await this.feedPostRepo.save(post);
      console.log(`[EventsScheduler] 📅 Etkinlik başlangıç postu oluşturuldu: ${event.title}`);
    } catch (err) {
      console.error('[EventsScheduler] createEventStartPost hata:', err);
    }
  }

  /**
   * Etkinlik bitiş postu
   */
  private async createEventEndPost(event: any) {
    try {
      const post = this.feedPostRepo.create({
        authorId: '00000000-0000-0000-0000-000000000000',
        contentText: `✅ Etkinlik Tamamlandı: "${event.title}"\n\nEtkinliğimize katılan herkese teşekkürler! Deneyimlerinizi paylaşmak için anketi doldurmayı unutmayın.`,
        scope: 'global',
        postType: 'announcement',
        isSystem: true,
        isPinned: false,
        reactions: {},
        metadata: {
          eventId: event.id,
          type: 'event_end',
          eventTitle: event.title,
        },
      });
      await this.feedPostRepo.save(post);
      console.log(`[EventsScheduler] ✅ Etkinlik bitiş postu oluşturuldu: ${event.title}`);
    } catch (err) {
      console.error('[EventsScheduler] createEventEndPost hata:', err);
    }
  }

  /**
   * Etkinlik sonrası otomatik değerlendirme anketi postu
   */
  private async createEventSurveyPost(event: any) {
    try {
      const post = this.feedPostRepo.create({
        authorId: '00000000-0000-0000-0000-000000000000',
        contentText: `📊 "${event.title}" Etkinlik Değerlendirmesi`,
        scope: event.group_id ? 'group' : 'global',
        postType: 'multiple_choice',
        isSystem: true,
        isPinned: true,
        reactions: {},
        metadata: {
          eventId: event.id,
          type: 'event_survey',
          question: `"${event.title}" etkinliğini nasıl değerlendiriyorsunuz?`,
          options: ['Çok Faydalıydı', 'Faydalıydı', 'Orta', 'Pek Faydalı Değildi'],
          allowMultiple: false,
          text: `"${event.title}" etkinliğini nasıl değerlendiriyorsunuz?`,
          allowComments: true,
        },
        groupId: event.group_id || null,
      });
      await this.feedPostRepo.save(post);
      console.log(`[EventsScheduler] 📊 Etkinlik anketi oluşturuldu: ${event.title}`);
    } catch (err) {
      console.error('[EventsScheduler] createEventSurveyPost hata:', err);
    }
  }

  /**
   * Günlük AI Özeti (gece 23:00 - 23:59 arası)
   */
  private async checkDailySummary() {
    try {
      const now = new Date();
      const currentHour = now.getUTCHours() + 3; // TR timezone (UTC+3)
      const today = now.toISOString().split('T')[0];

      if (currentHour < 23 || this.lastDailySummaryDate === today) return;

      this.lastDailySummaryDate = today;
      await this.createDailySummaryPost(today);
    } catch (err) {
      console.error('[EventsScheduler] checkDailySummary hata:', err);
    }
  }

  /**
   * Günlük özet postu oluştur
   */
  private async createDailySummaryPost(date: string) {
    try {
      const [postCount, engagementCount, attendanceCount] = await Promise.all([
        this.dataSource.query(
          `SELECT COUNT(*) as cnt FROM feed_posts WHERE DATE(created_at) = $1`, [date]
        ),
        this.dataSource.query(
          `SELECT COUNT(*) as cnt FROM content_engagements WHERE DATE(created_at) = $1`, [date]
        ),
        this.dataSource.query(
          `SELECT COUNT(*) as cnt FROM spatial_temporal_logs WHERE DATE(created_at) = $1`, [date]
        ),
      ]);

      const posts = parseInt(postCount[0]?.cnt || '0');
      const engagements = parseInt(engagementCount[0]?.cnt || '0');
      const attendances = parseInt(attendanceCount[0]?.cnt || '0');

      const summary = `📅 **${new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} Günlük Özet**\n\n` +
        `Bugün kampımızda:\n` +
        `📝 ${posts} yeni gönderi paylaşıldı\n` +
        `💬 ${engagements} etkileşim gerçekleşti\n` +
        `✅ ${attendances} yoklama kaydı oluştu\n\n` +
        `Vizyon Kampı olarak bugünü de başarıyla tamamladık! 🌟`;

      // Önce bugün özet var mı kontrol et
      const existing = await this.feedPostRepo.findOne({
        where: { isSystem: true, scope: 'global', postType: 'announcement' },
        order: { createdAt: 'DESC' },
      });

      if (existing?.metadata && existing.metadata.type === 'daily_summary' && 
          existing.metadata.date === date) {
        return; // Bugün zaten oluşturulmuş
      }

      const post = this.feedPostRepo.create({
        authorId: '00000000-0000-0000-0000-000000000000',
        contentText: summary,
        scope: 'global',
        postType: 'announcement',
        isSystem: true,
        isPinned: false,
        reactions: {},
        metadata: {
          type: 'daily_summary',
          date,
          stats: { posts, engagements, attendances },
          text: summary,
          allowComments: false,
        },
      });
      await this.feedPostRepo.save(post);
      console.log(`[EventsScheduler] 📅 Günlük özet oluşturuldu: ${date}`);
    } catch (err) {
      console.error('[EventsScheduler] createDailySummaryPost hata:', err);
    }
  }
}
