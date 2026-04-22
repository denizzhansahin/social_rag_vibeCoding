import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class FeedPost {
  @Field(() => ID)
  id: string;

  @Field()
  authorId: string;

  @Field({ nullable: true })
  groupId?: string;

  @Field({ nullable: true })
  contentText?: string;

  @Field({ nullable: true })
  postType?: string;

  @Field({ nullable: true })
  scope?: string;

  @Field({ nullable: true })
  isPinned?: boolean;

  @Field({ nullable: true })
  isSystem?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  attachments?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  reactions?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field({ nullable: true })
  createdAt?: Date;
}

@InputType()
export class CreatePostInput {
  @Field()
  authorId: string;

  @Field({ nullable: true })
  groupId?: string;

  @Field()
  contentText: string;

  @Field({ defaultValue: 'global' })
  scope: string;

  @Field({ defaultValue: 'text' })
  postType: string;

  @Field({ defaultValue: false })
  isSystem: boolean;

  @Field({ defaultValue: false })
  isPinned: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;
}
