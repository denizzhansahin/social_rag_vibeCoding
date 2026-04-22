import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { Event } from '../events/event.model';

@ObjectType()
export class Group {
  @Field(() => ID) id: string;
  @Field({ nullable: true }) eventId: string;
  @Field() name: string;
  @Field({ nullable: true }) mentorId: string;
  @Field(() => GraphQLJSON, { nullable: true }) metadata: any;
  @Field(() => GraphQLJSON, { nullable: true }) aiInsights: any;
  @Field() createdAt: Date;

  @Field(() => [Event], { nullable: true })
  assignedEvents: Event[];

  @Field(() => [String], { nullable: true })
  mentors?: string[];

  @Field(() => [GroupMentor], { nullable: true })
  mentorsDetailed?: any[];

  @Field(() => [String], { nullable: true })
  members?: string[];
}

@ObjectType()
export class DetailedGroupMember {
  @Field() id: string;
  @Field() email: string;
  @Field() role: string;
  @Field({ nullable: true }) status: string;
  @Field(() => GraphQLJSON, { nullable: true }) cognitiveProfile: any;
  @Field(() => GraphQLJSON, { nullable: true }) computedTags: any;
  @Field({ nullable: true }) lastLoginAt: Date;
  @Field({ nullable: true }) joinedAt: Date;
}

@ObjectType()
export class GroupMentor {
  @Field() mentorId: string;
  @Field() groupId: string;
  @Field() isPrimary: boolean;
  @Field(() => GraphQLJSON, { nullable: true }) mentorProfile: any;
}

@ObjectType()
export class GroupMember {
  @Field(() => ID) id: string;
  @Field() groupId: string;
  @Field() userId: string;
  @Field() joinedAt: Date;
}

@InputType()
export class CreateGroupInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  eventId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  mentorId: string;
}

@InputType()
export class AssignMemberInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  groupId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  userId: string;
}
@InputType()
export class UpdateGroupInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata: any;
}
