import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';
import { ObjectType, Field, Float, ID } from '@nestjs/graphql';

@Entity('ai_matching_results')
@Unique(['userAId', 'userBId'])
@ObjectType()
export class MatchingResult {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ name: 'user_a_id', type: 'uuid' })
  @Field()
  userAId: string;

  @Column({ name: 'user_b_id', type: 'uuid' })
  @Field()
  userBId: string;

  @Field({ nullable: true })
  userAName?: string;

  @Field({ nullable: true })
  userBName?: string;

  @Column({ name: 'similarity_score', type: 'float' })
  @Field(() => Float)
  similarityScore: number;

  @CreateDateColumn({ name: 'matched_at' })
  @Field()
  matchedAt: Date;

  @Field({ nullable: true })
  role?: string;

  @Field({ nullable: true })
  trait?: string;

  @Field({ nullable: true })
  name?: string;
}
