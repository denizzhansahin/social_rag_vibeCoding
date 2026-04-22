import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { ContentEngagement } from './entities/content-engagement.entity';
import { CreateContentEngagementInput } from './dto/create-content-engagement.input';
import { ActionType } from './enums/engagement.enum';
import { FeedPostEntity } from '../feed-posts/feed-post.entity';

@Injectable()
export class ContentEngagementsService {
  constructor(
    @InjectRepository(ContentEngagement)
    private repo: Repository<ContentEngagement>,
    @InjectRepository(FeedPostEntity)
    private feedRepo: Repository<FeedPostEntity>,
    private readonly redisService: RedisService,
  ) {}

  async create(input: CreateContentEngagementInput): Promise<ContentEngagement> {
    let parsedResponseData: any = {};
    let parsedBehavioral = {};
    
    if (input.responseData) {
      try { parsedResponseData = JSON.parse(input.responseData); } catch (e) {}
    }
    if (input.behavioralMetrics) {
      try { parsedBehavioral = JSON.parse(input.behavioralMetrics); } catch (e) {}
    }

    const engagement = this.repo.create({
      userId: input.userId,
      objectId: input.objectId,
      nature: input.nature,
      action: input.action,
      responseData: parsedResponseData,
      behavioralMetrics: parsedBehavioral,
      seenAt: input.seenAt,
      interactedAt: input.interactedAt,
    });

    await this.repo.save(engagement);
    console.log(`📌 Etkileşim Loglandı: ${engagement.action} - Obj: ${engagement.objectId}`);

    // --- Poll/Mood Results Aggregation ---
    if (engagement.action === ActionType.answered) {
       const post = await this.feedRepo.findOne({ where: { id: engagement.objectId } });
       if (post) {
          const metadata = post.metadata || {};
          if (!metadata.votes) metadata.votes = {};
          if (!metadata.totalVotes) metadata.totalVotes = 0;

          // Multiple Choice result
          if (parsedResponseData.selected_option) {
            const opt = parsedResponseData.selected_option;
            metadata.votes[opt] = (metadata.votes[opt] || 0) + 1;
            metadata.totalVotes += 1;
          } 
          // Mood Checkin result
          else if (parsedResponseData.selected_label) {
            const label = parsedResponseData.selected_label;
            metadata.votes[label] = (metadata.votes[label] || 0) + 1;
            metadata.totalVotes += 1;
          }

          post.metadata = metadata;
          await this.feedRepo.save(post);
          console.log(`📊 Poll Sonuçları Güncellendi: ${post.id}`);
       }
    }
    // -------------------------------------

    // Etkileşim kaydedildi. İki ana görevi AI-Worker'a paslıyoruz:
    
    // 1. Davranış profilleme (Dürtüsel, Tereddütlü vb. Neo4j'ye etiket ve bağ atmak için)
    await this.redisService.pushTaskToQueue('analyze_engagement', {
      engagement_id: engagement.id,
      action: engagement.action,
    });

    // 2. Kullanıcı metin (free_text) doldurduysa bunu embedding yapıp vektör memory'e yazsın
    if (engagement.action === ActionType.answered && engagement.responseData?.['free_text_answer']) {
      await this.redisService.pushTaskToQueue('vectorize_engagement_response', {
        engagement_id: engagement.id,
      });
    }

    return engagement;
  }

  async findAll(): Promise<ContentEngagement[]> {
    return this.repo.find({ order: { interactedAt: 'DESC' }, take: 100 });
  }

  async findByUser(userId: string): Promise<ContentEngagement[]> {
    return this.repo.find({
      where: { userId },
      order: { interactedAt: 'DESC' },
    });
  }
}
