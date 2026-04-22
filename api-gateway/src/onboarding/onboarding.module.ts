import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingQuestionEntity, OnboardingResponseEntity } from './onboarding.entity';
import { OnboardingService } from './onboarding.service';
import { OnboardingResolver } from './onboarding.resolver';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnboardingQuestionEntity, OnboardingResponseEntity]),
    RedisModule,
  ],
  providers: [OnboardingService, OnboardingResolver],
  exports: [OnboardingService],
})
export class OnboardingModule {}
