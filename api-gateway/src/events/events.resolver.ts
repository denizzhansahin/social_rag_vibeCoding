import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { EventsService } from './events.service';
import { Event, CreateEventInput, UpdateEventInput, EventAssignment, EventGroup, EventAssignmentRole } from './event.model';
import { Group } from '../groups/group.model';
import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class EventDetail {
  @Field(() => GraphQLJSON) attendance: any;
  @Field(() => GraphQLJSON) engagements: any;
  @Field(() => Float, { nullable: true }) avgFeedbackScore: number;
  @Field(() => Int) feedbackCount: number;
  @Field(() => Float, { nullable: true }) avgMentorScore: number;
  @Field(() => Int) mentorEvalCount: number;
  @Field(() => [Group], { nullable: true }) assignedGroups: Group[];
  @Field(() => [EventAssignment], { nullable: true }) assignments: EventAssignment[];
}

@ObjectType()
export class AttendanceTrendEntry {
  @Field() eventId: string;
  @Field() title: string;
  @Field() eventType: string;
  @Field() startTime: Date;
  @Field(() => Int) totalAttendance: number;
  @Field(() => Int) onTimeCount: number;
  @Field(() => Int) lateCount: number;
}

@ObjectType()
export class AttendanceByType {
  @Field() eventType: string;
  @Field(() => Int) eventCount: number;
  @Field(() => Float, { nullable: true }) avgAttendance: number;
}

@Resolver(() => Event)
export class EventsResolver {
  constructor(private readonly service: EventsService) {}

  @Query(() => [Event], { name: 'getEvents' })
  async getEvents() { return this.service.findAll(); }

  @Query(() => Event, { name: 'getEvent', nullable: true })
  async getEvent(@Args('id') id: string) { return this.service.findById(id); }

  /** Etkinlik detaylı istatistikleri (charts için) */
  @Query(() => EventDetail, { name: 'getEventDetail' })
  async getEventDetail(@Args('eventId') eventId: string) {
    return this.service.getEventDetail(eventId);
  }

  /** Tüm etkinliklerin zaman bazlı katılım trendi (line chart) */
  @Query(() => [AttendanceTrendEntry], { name: 'getAttendanceTrend' })
  async getAttendanceTrend() { return this.service.getAttendanceTrend(); }

  /** Etkinlik tipi bazlı katılım ortalaması (bar chart) */
  @Query(() => [AttendanceByType], { name: 'getAttendanceByType' })
  async getAttendanceByType() { return this.service.getAttendanceByType(); }

  @Mutation(() => Event)
  async createEvent(@Args('input') input: CreateEventInput) { 
    console.log('[EventsResolver] createEvent called with input:', JSON.stringify(input));
    return this.service.create(input); 
  }

  @Mutation(() => Event)
  async updateEvent(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateEventInput,
  ) {
    return this.service.update(id, input);
  }

  @Mutation(() => EventAssignment)
  async assignToEvent(
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('userId', { type: () => ID }) userId: string,
    @Args('role', { type: () => EventAssignmentRole }) role: EventAssignmentRole,
    @Args('notes', { nullable: true }) notes?: string,
  ) {
    return this.service.assignToEvent(eventId, userId, role, notes);
  }

  @Mutation(() => EventGroup)
  async assignGroupToEvent(
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('groupId', { type: () => ID }) groupId: string,
  ) {
    return this.service.assignGroupToEvent(eventId, groupId);
  }

  @Mutation(() => Boolean)
  async deleteEvent(@Args('id', { type: () => ID }) id: string) {
    return this.service.deleteEvent(id);
  }

  @ResolveField(() => [EventAssignment], { nullable: true })
  async assignments(@Parent() event: Event) {
    return this.service.getAssignments(event.id);
  }

  @ResolveField(() => [Group], { nullable: true })
  async assignedGroups(@Parent() event: Event) {
    return this.service.getGroupsByEvent(event.id);
  }

  /** Belirli bir kullanıcıya atanmış tüm etkinlikler (mentör, katılımcı, eğitmen) */
  @Query(() => [Event], { name: 'getEventsForUser' })
  async getEventsForUser(@Args('userId', { type: () => String }) userId: string) {
    return this.service.getEventsForUser(userId);
  }



  @Mutation(() => Boolean)
  async unassignGroupToEvent(
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('groupId', { type: () => ID }) groupId: string,
  ) {
    return this.service.unassignGroup(eventId, groupId);
  }

  @Mutation(() => Boolean)
  async unassignUserFromEvent(
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.service.unassignUser(eventId, userId);
  }

}

