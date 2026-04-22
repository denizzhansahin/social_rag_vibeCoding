import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationsService } from './evaluations.service';
import { EvaluationsResolver } from './evaluations.resolver';
import { Evaluation } from './entities/evaluation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation]),
  ],
  providers: [EvaluationsResolver, EvaluationsService],
})
export class EvaluationsModule {}
