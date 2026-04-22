import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { AgentChatLog } from './entities/chat-log.entity';
import { AskPalantirInput } from './dto/create-chat.input';

@Injectable()
export class IntelligenceChatService {
  constructor(
    @InjectRepository(AgentChatLog)
    private repo: Repository<AgentChatLog>,
    private readonly redisService: RedisService,
  ) {}

  async askPalantir(input: AskPalantirInput): Promise<AgentChatLog> {
    // 1. Soruyu (İsteği) boş cevapla veritabanına kaydet
    const log = this.repo.create({
      adminId: input.adminId,
      queryText: input.query,
      contextUsed: {},
      status: 'pending'
    });

    await this.repo.save(log);
    console.log(`🤖 İstihbarat Sorgusu Geldi: "${input.query}" (Admin: ${input.adminId})`);

    // 2. Python RAG/Graph AI Agent'ı uyandır (Redis Task)
    await this.redisService.pushTaskToQueue('process_palantir_query', {
      chat_id: log.id,
      query: input.query,
      admin_id: input.adminId,
    });

    // Anında geriye kaydı döndürüyoruz (Dashboard için pending durumda döner)
    return log;
  }

  async getRecentChats(adminId: string): Promise<AgentChatLog[]> {
    return this.repo.find({ 
      where: { adminId }, 
      order: { createdAt: 'DESC' }, 
      take: 50 
    });
  }

  async getChatLog(id: string): Promise<AgentChatLog | null> {
    return this.repo.findOne({ where: { id } });
  }
}
