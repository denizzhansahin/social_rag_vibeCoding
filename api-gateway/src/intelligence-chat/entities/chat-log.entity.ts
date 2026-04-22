import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
@Entity('agent_chat_logs')
export class AgentChatLog {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'admin_id' })
  adminId: string;

  @Field()
  @Column({ name: 'query_text' })
  queryText: string;

  @Field({ nullable: true })
  @Column({ name: 'ai_response_text', nullable: true })
  aiResponseText?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ name: 'context_used', type: 'jsonb', nullable: true })
  contextUsed?: object;

  @Field()
  @Column({ default: 'pending' })
  status: string;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
