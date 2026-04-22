import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { EvaluationCategory } from '../enums/evaluation-category.enum';
import { EvaluationTargetType } from '../enums/evaluation-target-type.enum';

// GraphQL şeması için Enum'ları kaydet
registerEnumType(EvaluationCategory, {
  name: 'EvaluationCategory',
});

registerEnumType(EvaluationTargetType, {
  name: 'EvaluationTargetType',
});

@ObjectType()
@Entity('evaluations')
export class Evaluation {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'evaluator_id' })
  evaluatorId: string;

  @Field()
  @Column({ name: 'target_id' })
  targetId: string;

  @Field(() => EvaluationTargetType)
  @Column({ type: 'enum', enum: EvaluationTargetType, name: 'target_type', default: EvaluationTargetType.USER })
  targetType: EvaluationTargetType;

  @Field(() => EvaluationCategory)
  @Column({ type: 'enum', enum: EvaluationCategory })
  category: EvaluationCategory;

  @Field({ nullable: true })
  @Column({ name: 'raw_mentor_note', nullable: true })
  rawMentorNote?: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'score_1_to_5', nullable: true })
  score1to5?: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'score_1_to_100', nullable: true })
  score1to100?: number;

  @Field(() => String, { nullable: true })
  @Column({ name: 'ai_extracted_insights', type: 'jsonb', nullable: true })
  aiExtractedInsights?: object;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
