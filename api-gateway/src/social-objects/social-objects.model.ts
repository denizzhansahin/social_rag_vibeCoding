import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class SocialObject {
  @Field(() => ID)
  id: string;

  @Field()
  createdBy: string;

  @Field()
  objectType: string;

  @Field(() => GraphQLJSON, { nullable: true })
  uiPayload?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  targetRules?: any;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@InputType()
export class CreateSocialObjectInput {
  @Field()
  createdBy: string;

  @Field()
  objectType: string;

  @Field(() => GraphQLJSON, { nullable: true })
  uiPayload?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  targetRules?: any;
}
