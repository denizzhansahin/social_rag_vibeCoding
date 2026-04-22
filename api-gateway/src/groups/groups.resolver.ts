import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { GroupsService } from './groups.service';
import { Group, GroupMember, CreateGroupInput, UpdateGroupInput, AssignMemberInput, GroupMentor, DetailedGroupMember } from './group.model';
import { Event } from '../events/event.model';
import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class GroupStats {
  @Field(() => Int) memberCount: number;
  @Field(() => Float) avgStress: number;
  @Field(() => Float) avgLeadership: number;
  @Field(() => Float) avgPunctuality: number;
  @Field(() => GraphQLJSON) engagementBreakdown: any;
}

@Resolver(() => Group)
export class GroupsResolver {
  constructor(private readonly service: GroupsService) { }

  @Query(() => [Group], { name: 'getGroups' })
  async getGroups() { 
    console.log('[GroupsResolver] getGroups called');
    const result = await this.service.getGroups(); 
    console.log(`[GroupsResolver] Returning ${result.length} groups.`);
    return result;
  }

  @Query(() => Group, { name: 'getGroup', nullable: true })
  async getGroup(@Args('id') id: string) { return this.service.getGroupById(id); }

  @Query(() => [Group], { name: 'getGroupsByEvent' })
  async getGroupsByEvent(@Args('eventId') eventId: string) { return this.service.getGroupsByEvent(eventId); }

  @Query(() => [GroupMember], { name: 'getGroupMembers' })
  async getGroupMembers(@Args('groupId') groupId: string) { return this.service.getMembers(groupId); }

  @Query(() => [GroupMentor], { name: 'getGroupMentors' })
  async getGroupMentors(@Args('groupId') groupId: string) { return this.service.getMentorsByGroupDetailed(groupId); }

  /** Grup detaylı istatistikleri */
  @Query(() => GroupStats, { name: 'getGroupStats' })
  async getGroupStats(@Args('groupId') groupId: string) { return this.service.getGroupStats(groupId); }

  /** Grup üyeleri — profil ve cognitive data dahil */
  @Query(() => [DetailedGroupMember], { name: 'getGroupMembersDetailed' })
  async getGroupMembersDetailed(@Args('groupId') groupId: string) {
    return this.service.getGroupMembersDetailed(groupId);
  }

  @Mutation(() => Group)
  async createGroup(@Args('input') input: CreateGroupInput) { 
    console.log('[GroupsResolver] createGroup called with input:', JSON.stringify(input));
    return this.service.createGroup(input); 
  }

  @Mutation(() => Group)
  async updateGroup(
    @Args('id') id: string,
    @Args('input') input: UpdateGroupInput,
  ) {
    return this.service.updateGroup(id, input);
  }

  @Mutation(() => GroupMember)
  async assignUserToGroup(@Args('input') input: AssignMemberInput) {
    return this.service.assignMember(input.groupId, input.userId);
  }

  @Mutation(() => GroupMentor)
  async addMentorToGroup(
    @Args('groupId') groupId: string,
    @Args('mentorId') mentorId: string,
    @Args('isPrimary', { defaultValue: false }) isPrimary: boolean,
  ) {
    return this.service.addMentorToGroup(groupId, mentorId, isPrimary);
  }

  @Mutation(() => Boolean)
  async removeMentorFromGroup(
    @Args('groupId') groupId: string,
    @Args('mentorId') mentorId: string,
  ) {
    return this.service.removeMentorFromGroup(groupId, mentorId);
  }

  @Mutation(() => Boolean)
  async updateGroupPrimaryMentor(
    @Args('groupId') groupId: string,
    @Args('mentorId') mentorId: string,
  ) {
    return this.service.updatePrimaryMentor(groupId, mentorId);
  }

  /** AI Grup Analizi İste */
  @Mutation(() => String)
  async requestGroupInsight(@Args('groupId') groupId: string) {
    return this.service.requestGroupInsight(groupId);
  }

  @Mutation(() => Boolean)
  async deleteGroup(@Args('id') id: string) {
    return this.service.deleteGroup(id);
  }

  @Mutation(() => Boolean)
  async removeUserFromGroup(@Args('groupId') groupId: string, @Args('userId') userId: string) {
    return this.service.removeMember(groupId, userId);
  }

  @ResolveField(() => [Event], { nullable: true })
  async assignedEvents(@Parent() group: Group) {
    return this.service.getEventsByGroup(group.id);
  }

  @ResolveField(() => [String], { nullable: true })
  async mentors(@Parent() group: Group) {
    return this.service.getMentorsByGroup(group.id);
  }

  @ResolveField(() => [GroupMentor], { nullable: true })
  async mentorsDetailed(@Parent() group: Group) {
    return this.service.getMentorsByGroupDetailed(group.id);
  }

  @ResolveField(() => [String], { nullable: true })
  async members(@Parent() group: Group) {
    return this.service.getMemberIdsByGroup(group.id);
  }
}
