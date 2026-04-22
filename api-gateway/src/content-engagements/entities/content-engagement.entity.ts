import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { InteractionNature, ActionType } from '../enums/engagement.enum';
import GraphQLJSON from 'graphql-type-json';

registerEnumType(InteractionNature, { name: 'InteractionNature' });
registerEnumType(ActionType, { name: 'ActionType' });

@ObjectType()
@Entity('content_engagements')
export class ContentEngagement {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @Field()
  @Column({ name: 'object_id' })
  objectId: string;

  @Field(() => InteractionNature)
  @Column({ type: 'enum', enum: InteractionNature })
  nature: InteractionNature;

  @Field(() => ActionType)
  @Column({ type: 'enum', enum: ActionType })
  action: ActionType;

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ name: 'response_data', type: 'jsonb', nullable: true })
  responseData?: object;

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ name: 'behavioral_metrics', type: 'jsonb', nullable: true })
  behavioralMetrics?: object;

  @Field()
  @Column({ name: 'seen_at', type: 'timestamptz' })
  seenAt: Date;

  @Field({ nullable: true })
  @Column({ name: 'interacted_at', type: 'timestamptz', nullable: true })
  interactedAt?: Date;
}
