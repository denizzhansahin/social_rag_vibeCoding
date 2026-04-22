import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { CreateEvaluationInput } from './dto/create-evaluation.input';
import { Evaluation } from './entities/evaluation.entity';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    private readonly redisService: RedisService,
  ) {}

  async create(input: CreateEvaluationInput): Promise<Evaluation> {
    const newEvaluation = this.evaluationRepository.create({
      evaluatorId: input.evaluatorId,
      targetId: input.targetId,
      targetType: input.targetType,
      category: input.category,
      rawMentorNote: input.rawMentorNote,
      score1to5: input.score1to5,
      score1to100: input.score1to100,
    });

    await this.evaluationRepository.save(newEvaluation);
    console.log('✅ Değerlendirme Postgres\'e kaydedildi. ID:', newEvaluation.id);

    // Eğer analiz edilecek bir not varsa, AI worker'ı tetikle
    if (newEvaluation.rawMentorNote) {
      await this.redisService.pushTaskToQueue('analyze_mentor_evaluation', {
        evaluation_id: newEvaluation.id,
      });
    }

    return newEvaluation;
  }

  async findAll(): Promise<Evaluation[]> {
    return this.evaluationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByTarget(targetId: string): Promise<Evaluation[]> {
    return this.evaluationRepository.find({
      where: { targetId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Evaluation | null> {
    return this.evaluationRepository.findOneBy({ id });
  }
}
