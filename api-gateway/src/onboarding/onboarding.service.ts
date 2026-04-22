import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnboardingQuestionEntity, OnboardingResponseEntity } from './onboarding.entity';
import { SubmitOnboardingInput, CreateQuestionInput } from './onboarding.model';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingQuestionEntity)
    private readonly questionsRepo: Repository<OnboardingQuestionEntity>,
    @InjectRepository(OnboardingResponseEntity)
    private readonly responsesRepo: Repository<OnboardingResponseEntity>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) { }

  async getActiveQuestions() {
    return this.questionsRepo.find({
      where: { isActive: true },
      order: { orderIndex: 'ASC' },
    });
  }

  async getAllQuestions() {
    return this.questionsRepo.find({ order: { orderIndex: 'ASC' } });
  }

  async createQuestion(input: CreateQuestionInput) {
    try {
      const question = this.questionsRepo.create({
        questionText: input.questionText,
        questionType: input.questionType,
        options: input.options || [],
        orderIndex: input.orderIndex,
        isActive: true,
      });
      const saved = await this.questionsRepo.save(question);
      console.log('✅ Onboarding sorusu oluşturuldu:', saved.id);
      return saved;
    } catch (error) {
      console.error('❌ Onboarding sorusu oluşturma hatası:', error);
      throw error;
    }
  }

  async updateQuestion(input: any) {
    const { id, ...updates } = input;
    const question = await this.questionsRepo.findOne({ where: { id } });
    if (!question) throw new Error('Soru bulunamadı');
    
    Object.assign(question, updates);
    return this.questionsRepo.save(question);
  }

  async deleteQuestion(id: string) {
    await this.questionsRepo.delete(id);
    return true;
  }

  async toggleQuestion(id: string, isActive: boolean) {
    const question = await this.questionsRepo.findOne({ where: { id } });
    if (!question) throw new Error('Question not found');
    question.isActive = isActive;
    return this.questionsRepo.save(question);
  }

  async getUserResponses(userId: string) {
    return this.responsesRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllResponses() {
    return this.responsesRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateResponse(userId: string, questionId: string, responseData: string) {
    const existing = await this.responsesRepo.findOne({
      where: { userId, questionId },
    });

    if (existing) {
      existing.responseData = responseData;
      return this.responsesRepo.save(existing);
    }

    // Create new response if not exists
    const response = this.responsesRepo.create({
      userId,
      questionId,
      responseData,
    });
    return this.responsesRepo.save(response);
  }

  async submitOnboarding(input: SubmitOnboardingInput) {
    const { userId, answers } = input;

    // Save or update answers
    for (const ans of answers) {
      await this.updateResponse(userId, ans.questionId, ans.responseData);
    }

    // Set hasCompletedOnboarding to TRUE
    await this.dataSource.query(`
      UPDATE master_identities 
      SET has_completed_onboarding = true 
      WHERE id = $1
    `, [userId]);

    // Send to AI Worker to create embeddings & matching
    await this.redisService.pushTaskToQueue('handle_user_onboarding', {
      user_id: userId,
      responses: answers
    });

    return true;
  }
}

