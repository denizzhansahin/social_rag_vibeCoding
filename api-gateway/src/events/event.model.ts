import { ObjectType, Field, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDate } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { Group } from '../groups/group.model';

export enum EventAssignmentRole {
  MENTOR = 'mentor',
  TEACHER = 'teacher',
  PARTICIPANT = 'participant',
}

registerEnumType(EventAssignmentRole, { name: 'EventAssignmentRole' });

@ObjectType()
export class EventAssignment {
  @Field(() => ID) id: string;
  @Field() eventId: string;
  @Field() userId: string;
  @Field(() => EventAssignmentRole) role: EventAssignmentRole;
  @Field({ nullable: true }) notes: string;
  @Field() createdAt: Date;
}

@ObjectType()
export class EventGroup {
  @Field(() => ID) id: string;
  @Field() eventId: string;
  @Field() groupId: string;
  @Field() createdAt: Date;
}

@ObjectType()
export class Event {
  @Field(() => ID) id: string;
  @Field() title: string;
  @Field({ nullable: true }) description: string;
  @Field() eventType: string;
  @Field({ nullable: true }) location: string;
  @Field() startTime: Date;
  @Field({ nullable: true }) endTime: Date;
  @Field({ nullable: true }) groupId: string;
  @Field({ nullable: true }) createdBy: string;
  @Field(() => GraphQLJSON, { nullable: true }) metadata: any;
  @Field() isActive: boolean;
  @Field() createdAt: Date;

  @Field(() => [EventAssignment], { nullable: true })
  assignments: EventAssignment[];

  @Field(() => [EventGroup], { nullable: true })
  eventGroups: EventGroup[];

  @Field(() => [Group], { nullable: true })
  assignedGroups: Group[];
}

@InputType()
export class CreateEventInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description: string;

  @Field({ defaultValue: 'workshop' })
  @IsOptional()
  @IsString()
  eventType: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location: string;

  @Field()
  @IsNotEmpty()
  startTime: Date;

  @Field({ nullable: true })
  @IsOptional()
  endTime: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupId?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  createdBy: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata: any;
}
@InputType()
export class UpdateEventInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  eventType: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location: string;

  @Field({ nullable: true })
  @IsOptional()
  startTime: Date;

  @Field({ nullable: true })
  @IsOptional()
  endTime: Date;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata: any;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}
