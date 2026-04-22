import { ObjectType, Field, ID } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class AuthUser {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field({ nullable: true })
  status: string;

  @Field({ nullable: true })
  groupId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  cognitiveProfile?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  socialLinks?: any;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  hasCompletedOnboarding: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  telemetrySummary?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  performanceMetrics?: any;
}

@ObjectType()
export class AuthPayload {
  @Field()
  token: string;

  @Field(() => AuthUser)
  user: AuthUser;
}
